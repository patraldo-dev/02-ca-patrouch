import { getOrCreateDailyPrompt, getNewPromptForUser, getCategoryForDate } from './prompt-generator.js';

const DAILY_PASS_LIMIT = 3;

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getTodayData(db, ai, userId) {
  const today = getToday();

  // Get today's default prompt (with fallback)
  let prompt;
  try {
    prompt = await getOrCreateDailyPrompt(db, ai, today);
  } catch (err) {
    console.error('Failed to generate prompt:', err);
    prompt = {
      id: null,
      prompt_text: 'The well is dry today. Write whatever moves you — no prompt needed.',
      category: 'free writing'
    };
  }

  // Check user's action today
  const log = await db.prepare(
    'SELECT action, prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND action IN (?, ?) ORDER BY created_at DESC LIMIT 1'
  ).bind(userId, today, 'accepted', 'passed').first();

  // Count passes used today
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND action = 'passed'"
  ).bind(userId, today).first();

  const passesUsed = passCount?.count || 0;
  const passesRemaining = Math.max(0, DAILY_PASS_LIMIT - passesUsed);

  // If they passed and have remaining passes, show a new prompt
  let currentPrompt = prompt;
  if (log?.action === 'passed' && passesRemaining > 0) {
    currentPrompt = await getNewPromptForUser(db, ai, today, userId);
  }

  const stats = await getStats(db, userId);

  return {
    prompt: currentPrompt,
    userAction: log?.action || null,
    acceptedPromptId: log?.action === 'accepted' ? log.prompt_id : null,
    passesRemaining,
    passesUsed,
    dailyPassLimit: DAILY_PASS_LIMIT,
    stats
  };
}

export async function handleAction(db, ai, userId, action) {
  const today = getToday();

  if (action === 'passed') {
    // Check remaining passes
    const passCount = await db.prepare(
      "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND action = 'passed'"
    ).bind(userId, today).first();
    const passesUsed = passCount?.count || 0;

    if (passesUsed >= DAILY_PASS_LIMIT) {
      return { error: 'No passes remaining today', passesRemaining: 0 };
    }

    // Log the pass action with current prompt
    const currentPrompt = await getOrCreateDailyPrompt(db, ai, today);
    await db.prepare(
      'INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, currentPrompt.id, today, 'passed').run();

    // Update stats
    await updateStats(db, userId, 'passed');

    // Get a new prompt
    const newPrompt = await getNewPromptForUser(db, ai, today, userId);
    const newRemaining = DAILY_PASS_LIMIT - passesUsed - 1;

    return {
      prompt: newPrompt,
      passesRemaining: newRemaining,
      passesUsed: passesUsed + 1,
      action: 'passed'
    };
  }

  if (action === 'accepted') {
    const currentPrompt = await getOrCreateDailyPrompt(db, ai, today);
    await db.prepare(
      'INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, currentPrompt.id, today, 'accepted').run();

    await updateStats(db, userId, 'accepted');

    return {
      promptId: currentPrompt.id,
      prompt: currentPrompt,
      action: 'accepted',
      passesRemaining: await getPassesRemaining(db, userId, today)
    };
  }

  return { error: 'Invalid action' };
}

async function getPassesRemaining(db, userId, dateStr) {
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND action = 'passed'"
  ).bind(userId, dateStr).first();
  return Math.max(0, DAILY_PASS_LIMIT - (passCount?.count || 0));
}

export async function updateStats(db, userId, action, wordCount = 0) {
  const existing = await db.prepare(
    'SELECT * FROM user_writing_stats WHERE user_id = ?'
  ).bind(userId).first();

  const today = getToday();
  const yesterday = getYesterday();

  if (!existing) {
    await db.prepare(
      `INSERT INTO user_writing_stats (user_id, total_writings, total_words, current_streak, longest_streak, prompts_accepted, prompts_passed, last_writing_date, updated_at)
       VALUES (?, 0, 0, 0, 0, 0, 0, NULL, datetime('now'))`
    ).bind(userId).run();
    return updateStats(db, userId, action, wordCount);
  }

  let currentStreak = existing.current_streak || 0;
  let longestStreak = existing.longest_streak || 0;
  let totalWritings = existing.total_writings || 0;
  let totalWords = existing.total_words || 0;
  let promptsAccepted = existing.prompts_accepted || 0;
  let promptsPassed = existing.prompts_passed || 0;
  let lastDate = existing.last_writing_date;

  // Update streak logic
  if (action === 'accepted' || action === 'written') {
    if (lastDate === today) {
      // Already counted today, no streak change
    } else if (lastDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    lastDate = today;
  }

  if (action === 'accepted') promptsAccepted += 1;
  if (action === 'passed') promptsPassed += 1;
  if (action === 'written') {
    totalWritings += 1;
    totalWords += wordCount;
  }

  await db.prepare(
    `UPDATE user_writing_stats SET total_writings = ?, total_words = ?, current_streak = ?,
     longest_streak = ?, prompts_accepted = ?, prompts_passed = ?, last_writing_date = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(totalWritings, totalWords, currentStreak, longestStreak, promptsAccepted, promptsPassed, lastDate, userId).run();
}

export async function getStats(db, userId) {
  return db.prepare('SELECT * FROM user_writing_stats WHERE user_id = ?').bind(userId).first() || {
    user_id: userId,
    total_writings: 0,
    total_words: 0,
    current_streak: 0,
    longest_streak: 0,
    prompts_accepted: 0,
    prompts_passed: 0,
    last_writing_date: null
  };
}

export async function getUserWritings(db, userId, options = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 50);
  const offset = (page - 1) * limit;
  const visibility = options.visibility || null;

  let query = 'SELECT w.*, wp.prompt_text FROM writings w LEFT JOIN writing_prompts wp ON w.prompt_id = wp.id WHERE w.user_id = ?';
  const binds = [userId];

  if (visibility) {
    query += ' AND w.visibility = ?';
    binds.push(visibility);
  }

  // Count
  const countResult = await db.prepare(query.replace('SELECT w.*', 'SELECT COUNT(*) as total')).bind(...binds).first();
  const total = countResult?.total || 0;

  query += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await db.prepare(query).bind(...binds).all();

  return {
    writings: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function publishWriting(db, userId, { title, content, promptId, aiAssisted, visibility }) {
  const id = crypto.randomUUID();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  await db.prepare(
    `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))`
  ).bind(id, userId, promptId || null, title, content, wordCount, aiAssisted ? 1 : 0, visibility || 'private').run();

  await updateStats(db, userId, 'written', wordCount);

  return { id, wordCount };
}

export async function saveDraft(db, userId, { title, content, promptId, aiAssisted }) {
  const id = crypto.randomUUID();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  await db.prepare(
    `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'private', 'draft', datetime('now'), datetime('now'))`
  ).bind(id, userId, promptId || null, title, content, wordCount, aiAssisted ? 1 : 0).run();

  return { id, wordCount };
}

export { DAILY_PASS_LIMIT };
