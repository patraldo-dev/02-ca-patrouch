import { getOrCreateDailyPrompt, getNewPromptForUser, getOrCreateCommunityPrompt, getCategoryForDate } from './prompt-generator.js';
import { checkAndUnlockBadges } from './engagement.js';

const DAILY_PASS_LIMIT = 3;

function getToday() {
    // Use CST (America/Mexico_City) date, not UTC
    const now = new Date();
    const cst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return cst.toISOString().slice(0, 10);
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getTodayData(db, ai, userId, locale = 'en') {
  const today = getToday();

  // Get or create the community prompt for today
  let communityPrompt;
  try {
    communityPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
  } catch (err) {
    console.error('Failed to generate community prompt:', err);
    communityPrompt = {
      id: null,
      prompt_text: 'The well is dry today. Write whatever moves you — no prompt needed.',
      category: 'daily-community'
    };
  }

  // Check user's log entries for today+locale
  const logs = await db.prepare(
    'SELECT action, prompt_id, is_community FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action IN (?, ?) ORDER BY created_at DESC'
  ).bind(userId, today, locale, 'accepted', 'passed').all();
  const entries = logs.results || [];

  // Count passes used today
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
  ).bind(userId, today, locale).first();
  const passesUsed = passCount?.count || 0;
  const passesRemaining = Math.max(0, DAILY_PASS_LIMIT - passesUsed);

  // Find if user accepted anything (community or personal) and hasn't completed it
  const acceptedEntry = entries.find(e => e.action === 'accepted');
  const completedEntry = entries.find(e => e.action === 'completed');

  // Determine what to show
  let currentPrompt = communityPrompt;
  let promptSource = 'community'; // 'community' | 'personal'
  let acceptedPromptId = null;
  let userAction = null;

  if (completedEntry) {
    // User already completed today — show congratulations / free write
    userAction = 'completed';
  } else if (acceptedEntry) {
    // User already accepted a prompt — show it
    userAction = 'accepted';
    acceptedPromptId = acceptedEntry.prompt_id;
    promptSource = acceptedEntry.is_community ? 'community' : 'personal';
    // Fetch the prompt they accepted
    if (acceptedEntry.prompt_id) {
      const p = await db.prepare('SELECT id, prompt_text, category FROM writing_prompts WHERE id = ?').bind(acceptedEntry.prompt_id).first();
      if (p) currentPrompt = p;
    }
  } else if (passesUsed > 0) {
    // User passed but hasn't accepted yet — show a personal prompt
    promptSource = 'personal';
    try {
      currentPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
    } catch (err) {
      console.error('Failed to generate personal prompt:', err);
    }
  }
  // else: no entries yet → show community prompt (default above)

  const stats = await getStats(db, userId);

  return {
    prompt: currentPrompt,
    promptSource,
    userAction,
    acceptedPromptId,
    passesRemaining,
    passesUsed,
    dailyPassLimit: DAILY_PASS_LIMIT,
    stats
  };
}

export async function handleAction(db, ai, userId, action, locale = 'en') {
  const today = getToday();

  if (action === 'passed') {
    const passCount = await db.prepare(
      "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
    ).bind(userId, today, locale).first();
    const passesUsed = passCount?.count || 0;

    if (passesUsed >= DAILY_PASS_LIMIT) {
      return { error: 'No passes remaining today', passesRemaining: 0 };
    }

    const communityPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
    await db.prepare(
      'INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, communityPrompt.id, today, 'passed', locale, 1).run();

    await updateStats(db, userId, 'passed');

    const newPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
    const newRemaining = DAILY_PASS_LIMIT - passesUsed - 1;

    // Log the new personal prompt as shown so we don't repeat it
    await db.prepare(
      'INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, newPrompt.id, today, 'passed', locale, 0).run();

    return {
      prompt: newPrompt,
      promptSource: 'personal',
      passesRemaining: newRemaining,
      passesUsed: passesUsed + 1,
      action: 'passed'
    };
  }

  if (action === 'accepted') {
    console.log('🎯 ACCEPT - userId:', userId, 'locale:', locale, 'today:', today);
    // or if no entries yet (accept community prompt)
    const logs = await db.prepare(
      'SELECT action FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? ORDER BY created_at DESC'
    ).bind(userId, today, locale).all();
    const hasPassed = (logs.results || []).some(e => e.action === 'passed');

    let currentPrompt;
    let isCommunity;

    if (hasPassed) {
      // Accept the current personal prompt
      currentPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
      isCommunity = 0;
    } else {
      // Accept the community prompt
      currentPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
      isCommunity = 1;
    }

    await db.prepare(
      'INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, currentPrompt.id, today, 'accepted', locale, isCommunity).run();

    await updateStats(db, userId, 'accepted');

    console.log('🎯 ACCEPT returning promptId:', currentPrompt.id);
    return {
      promptId: currentPrompt.id,
      prompt: currentPrompt,
      promptSource: isCommunity ? 'community' : 'personal',
      action: 'accepted',
      passesRemaining: await getPassesRemaining(db, userId, today, locale)
    };
  }

  if (action === 'completed') {
    // Mark today's accepted prompt as completed — user is done writing for the day
    await db.prepare(
      "UPDATE daily_prompt_log SET action = 'completed' WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'accepted'"
    ).bind(userId, today, locale).run();

    return { action: 'completed' };
  }

  return { error: 'Invalid action' };
}

async function getPassesRemaining(db, userId, dateStr, locale = 'en') {
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
  ).bind(userId, dateStr, locale).first();
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

  if (action === 'accepted' || action === 'written') {
    if (lastDate === today) {
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

  // Check for newly unlocked badges
  const stats = { total_writings: totalWritings, total_words: totalWords, current_streak: currentStreak, longest_streak: longestStreak };
  const newBadges = await checkAndUnlockBadges(db, userId, stats);

  return { stats, newBadges };
}

export async function getStats(db, userId) {
  const row = await db.prepare('SELECT * FROM user_writing_stats WHERE user_id = ?').bind(userId).first();

  // Cross-check with actual writings count to ensure stats aren't stale
  const writings = await db.prepare(
    'SELECT COUNT(*) as total, COALESCE(SUM(word_count), 0) as words FROM writings WHERE user_id = ? AND status = ?'
  ).bind(userId, 'published').first();

  const totalWritings = writings?.total || 0;
  const totalWords = writings?.words || 0;

  // Update if out of sync
  if (row && (row.total_writings !== totalWritings || row.total_words !== totalWords)) {
    await db.prepare(
      `UPDATE user_writing_stats SET total_writings = ?, total_words = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(totalWritings, totalWords, userId).run();
    row.total_writings = totalWritings;
    row.total_words = totalWords;
  }

  return row || {
    user_id: userId,
    total_writings: totalWritings,
    total_words: totalWords,
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

  await updateStats(db, userId, 'written', wordCount);

  return { id, wordCount };
}

// ── Agora: public writing queries ──

export async function getPublicWritings(db, options = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 12, 50);
  const offset = (page - 1) * limit;
  const locale = options.locale || null;
  const category = options.category || null;
  const author = options.author || null;

  let query = `
    SELECT w.id, w.title, w.content, w.word_count, w.category, w.ai_assisted, w.visibility, w.status,
           w.created_at, w.locale, u.username, u.role
    FROM writings w
    JOIN users u ON w.user_id = u.id
    WHERE w.visibility = 'public' AND w.status = 'published'
  `;
  const binds = [];

  if (locale) {
    query += ' AND w.locale = ?';
    binds.push(locale);
  }
  if (category) {
    query += ' AND w.category = ?';
    binds.push(category);
  }
  if (author === 'agents') {
    query += " AND u.role = 'agent'";
  } else if (author === 'humans') {
    query += " AND u.role != 'agent'";
  }
  // 'both' means no filter (default)

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM writings w JOIN users u ON w.user_id = u.id WHERE w.visibility = 'public' AND w.status = 'published'`
      + (locale ? ' AND w.locale = ?' : '')
      + (category ? ' AND w.category = ?' : '')
      + (author === 'agents' ? " AND u.role = 'agent'" : author === 'humans' ? " AND u.role != 'agent'" : '')
  ).bind(...binds).first();
  const total = countResult?.total || 0;

  query += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await db.prepare(query).bind(...binds).all();

  return { writings: results || [], total, page, pages: Math.ceil(total / limit) };
}

export async function getCommunityResponses(db, options = {}) {
  const limit = Math.min(options.limit || 20, 50);
  const locale = options.locale || null;

  // Get dates that have community prompt responses
  let dateQuery = `
    SELECT DISTINCT w.created_at as date
    FROM writings w
    JOIN writing_prompts wp ON w.prompt_id = wp.id
    JOIN users u ON w.user_id = u.id
    WHERE w.visibility = 'public' AND w.status = 'published' AND wp.category = 'daily-community'
  `;
  const dateBinds = [];
  if (locale) {
    dateQuery += ' AND w.locale = ?';
    dateBinds.push(locale);
  }
  dateQuery += ' ORDER BY date DESC LIMIT 30';

  const { results: dates } = await db.prepare(dateQuery).bind(...dateBinds).all();

  const groups = [];
  for (const row of dates || []) {
    const dateStr = row.date?.slice(0, 10);
    if (!dateStr) continue;

    // Get the community prompt for this date
    const prompt = await db.prepare(
      "SELECT prompt_text FROM writing_prompts WHERE prompt_date = ? AND category = 'daily-community' LIMIT 1"
    ).bind(dateStr).first();

    let responseQuery = `
      SELECT w.id, w.title, w.content, w.word_count, w.ai_assisted, w.created_at, u.username
      FROM writings w
      JOIN writing_prompts wp ON w.prompt_id = wp.id
      JOIN users u ON w.user_id = u.id
      WHERE w.visibility = 'public' AND w.status = 'published' AND wp.category = 'daily-community'
        AND w.created_at LIKE ?
    `;
    const rBinds = [dateStr + '%'];
    if (locale) {
      responseQuery += ' AND w.locale = ?';
      rBinds.push(locale);
    }
    responseQuery += ' ORDER BY w.created_at DESC LIMIT ?';
    rBinds.push(limit);

    const { results: writings } = await db.prepare(responseQuery).bind(...rBinds).all();

    if (writings?.length > 0) {
      groups.push({ date: dateStr, prompt: prompt?.prompt_text || '', writings });
    }
  }

  return groups;
}

export async function getUserProfile(db, username) {
  const user = await db.prepare(
    'SELECT id, username, email, role, created_at FROM users WHERE username = ?'
  ).bind(username).first();
  if (!user) return null;

  const stats = await getStats(db, user.id);

  const { results: publicWritings } = await db.prepare(
    `SELECT id, title, content, word_count, category, ai_assisted, visibility, status, locale, created_at
     FROM writings WHERE user_id = ? AND visibility = 'public' AND status = 'published'
     ORDER BY created_at DESC LIMIT 50`
  ).bind(user.id).all();

  return { user, stats, writings: publicWritings || [] };
}

export { DAILY_PASS_LIMIT };
