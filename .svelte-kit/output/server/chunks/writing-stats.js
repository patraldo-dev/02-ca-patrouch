import { f as checkAndUnlockBadges } from "./engagement.js";
const CATEGORIES = [
  "fiction",
  "poetry",
  "memoir",
  "sci-fi",
  "mystery",
  "romance",
  "fantasy",
  "creative non-fiction"
];
const LOCALE_LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French"
};
function getCategoryForDate(dateStr) {
  const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
  return CATEGORIES[d.getDate() % CATEGORIES.length];
}
async function getOrCreateDailyPrompt(db, ai, dateStr, categoryOverride, locale = "en") {
  const category = categoryOverride || getCategoryForDate(dateStr);
  const existing = await db.prepare(
    "SELECT id, prompt_text, category FROM writing_prompts WHERE prompt_date = ? AND category = ? AND locale = ? LIMIT 1"
  ).bind(dateStr, category, locale).first();
  if (existing) return existing;
  const promptText = await generatePromptWithAI(ai, category, locale);
  const id = crypto.randomUUID();
  await db.prepare(
    "INSERT INTO writing_prompts (id, prompt_text, prompt_date, category, locale) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, promptText, dateStr, category, locale).run();
  return { id, prompt_text: promptText, category };
}
async function getNewPromptForUser(db, ai, dateStr, userId, locale = "en") {
  const shown = await db.prepare(
    "SELECT prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ?"
  ).bind(userId, dateStr, locale).all();
  const shownIds = new Set(shown.results.map((r) => r.prompt_id));
  const baseIdx = (/* @__PURE__ */ new Date(dateStr + "T12:00:00")).getDate() % CATEGORIES.length;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat2 = CATEGORIES[(baseIdx + i) % CATEGORIES.length];
    const prompt = await getOrCreateDailyPrompt(db, ai, dateStr, cat2, locale);
    if (!shownIds.has(prompt.id)) return prompt;
  }
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  return getOrCreateDailyPrompt(db, ai, dateStr, cat, locale);
}
async function getOrCreateCommunityPrompt(db, ai, dateStr, locale = "en") {
  const existing = await db.prepare(
    "SELECT id, prompt_text, category FROM writing_prompts WHERE prompt_date = ? AND locale = ? AND category = 'daily-community' LIMIT 1"
  ).bind(dateStr, locale).first();
  if (existing) return existing;
  const promptText = await generatePromptWithAI(ai, "daily-community", locale);
  const id = crypto.randomUUID();
  await db.prepare(
    "INSERT INTO writing_prompts (id, prompt_text, prompt_date, category, locale) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, promptText, dateStr, "daily-community", locale).run();
  return { id, prompt_text: promptText, category: "daily-community" };
}
async function generatePromptWithAI(ai, category, locale = "en") {
  const lang = LOCALE_LANGUAGES[locale] || "English";
  const isCommunity = category === "daily-community";
  const themes = ["memory and forgetting", "a secret kept too long", "an unexpected inheritance", "a conversation overheard", "something found in an old coat pocket", "the last day of a job", "a neighbor nobody talks to", "a tradition nobody remembers starting", "a sound that triggers a memory", "the smell of a specific place", "a door that should not be opened", "a recipe with a hidden ingredient", "a photograph nobody can explain", "a promise made to a stranger", "the thing you said at the wrong moment", "an animal that appears at a critical moment", "a map to somewhere that no longer exists", "a language only two people speak", "the difference between leaving and escaping", "something borrowed and never returned"];
  const tones = ["darkly comic", "melancholic", "hopeful", "unsettling", "wistful", "absurdist", "tender", "surreal", "gritty", "whimsical", "ironic", "lyrical", "matter-of-fact"];
  const genres = isCommunity ? ["fiction", "poetry", "memoir", "sci-fi", "mystery", "romance", "fantasy", "horror", "thriller", "literary fiction", "speculative fiction", "historical fiction", "magical realism", "creative non-fiction", "flash fiction"] : [category];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const genre = pick(genres);
  const theme = pick(themes);
  const tone = pick(tones);
  const userPrompt = `Write a creative writing prompt in the ${genre} genre with a ${tone} tone. Theme: ${theme}. Reply in ${lang} only. Output ONLY the prompt text (1-3 sentences), nothing else.`;
  const systemPrompt = `You are a creative writing prompt generator for adult writers. Generate ONE specific, vivid writing prompt (1-3 sentences). Create a concrete scene or situation — avoid generic formulas. You MUST output ONLY in ${lang}. No other languages, no translations, no explanations, no commentary. Just the prompt.`;
  try {
    const response = await ai.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    let text = response.response?.trim() || getFallback(category, locale);
    text = text.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    if (text.startsWith("'") && text.endsWith("'")) text = text.slice(1, -1);
    if (!isValidScript(text, locale)) {
      console.error(`Language mismatch: locale=${locale}, text=${text.substring(0, 80)}`);
      return getFallback(category, locale);
    }
    return text;
  } catch (err) {
    console.error("AI prompt generation failed:", err);
    return getFallback(category, locale);
  }
}
function isValidScript(text, locale) {
  const arabic = /[\u0600-\u06FF]/;
  const cjk = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
  const cyrillic = /[\u0400-\u04FF]/;
  const devanagari = /[\u0900-\u097F]/;
  if (locale === "en" || locale === "es" || locale === "fr") {
    if (arabic.test(text) || cjk.test(text) || cyrillic.test(text) || devanagari.test(text)) return false;
  }
  return true;
}
function getFallback(category, locale = "en") {
  const fallbacks = {
    en: {
      fiction: "A letter arrives at your door, written in your own handwriting, dated ten years from now.",
      poetry: "Describe the sound of a color no one else can see.",
      memoir: "The meal that changed your understanding of home.",
      "sci-fi": "Humanity receives a reply to its first interstellar message — but it's in a language we invented as a joke.",
      mystery: "A painting in a museum changes slightly every night. Only you notice.",
      romance: "Two strangers keep finding each other's lost things.",
      fantasy: "The last dragon is small enough to fit in your pocket, and it has opinions.",
      "creative non-fiction": "Write about a place that exists differently in memory than in reality."
    },
    es: {
      fiction: "Una carta llega a tu puerta, escrita con tu propia letra, fechada diez años en el futuro.",
      poetry: "Describe el sonido de un color que nadie más puede ver.",
      memoir: "La comida que cambió tu comprensión del hogar.",
      "sci-fi": "La humanidad recibe una respuesta a su primer mensaje interestelar — pero está en un idioma que inventamos como broma.",
      mystery: "Un cuadro en un museo cambia ligeramente cada noche. Solo tú lo notas.",
      romance: "Dos desconocidos siguen encontrando las cosas perdidas del otro.",
      fantasy: "El último dragón es lo bastante pequeño para caber en tu bolsillo, y tiene opiniones.",
      "creative non-fiction": "Escribe sobre un lugar que existe diferente en la memoria que en la realidad."
    },
    fr: {
      fiction: "Une lettre arrive à votre porte, écrite de votre propre main, datée de dix ans dans le futur.",
      poetry: "Décrivez le son d'une couleur que personne d'autre ne peut voir.",
      memoir: "Le repas qui a changé votre compréhension du foyer.",
      "sci-fi": "L'humanité reçoit une réponse à son premier message interstellaire — mais c'est dans une langue que nous avons inventée pour plaisanter.",
      mystery: "Un tableau dans un musée change légèrement chaque nuit. Vous seul le remarquez.",
      romance: "Deux inconnus ne cessent de retrouver les choses perdues de l'autre.",
      fantasy: "Le dernier dragon est assez petit pour tenir dans votre poche, et il a des opinions.",
      "creative non-fiction": "Écrivez sur un lieu qui existe différemment dans la mémoire que dans la réalité."
    }
  };
  return fallbacks[locale] && fallbacks[locale][category] || fallbacks.en[category] || "Write about something you almost said but didn't.";
}
const DAILY_PASS_LIMIT = 3;
function getToday() {
  const now = /* @__PURE__ */ new Date();
  const cst = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  return cst.toISOString().slice(0, 10);
}
function getYesterday() {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
async function getTodayData(db, ai, userId, locale = "en") {
  const today = getToday();
  let communityPrompt;
  try {
    communityPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
  } catch (err) {
    console.error("Failed to generate community prompt:", err);
    communityPrompt = {
      id: null,
      prompt_text: "The well is dry today. Write whatever moves you — no prompt needed.",
      category: "daily-community"
    };
  }
  const logs = await db.prepare(
    "SELECT action, prompt_id, is_community FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action IN (?, ?) ORDER BY created_at DESC"
  ).bind(userId, today, locale, "accepted", "passed").all();
  const entries = logs.results || [];
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
  ).bind(userId, today, locale).first();
  const passesUsed = passCount?.count || 0;
  const passesRemaining = Math.max(0, DAILY_PASS_LIMIT - passesUsed);
  const acceptedEntry = entries.find((e) => e.action === "accepted");
  const completedEntry = entries.find((e) => e.action === "completed");
  let currentPrompt = communityPrompt;
  let promptSource = "community";
  let acceptedPromptId = null;
  let userAction = null;
  if (completedEntry) {
    userAction = "completed";
  } else if (acceptedEntry) {
    userAction = "accepted";
    acceptedPromptId = acceptedEntry.prompt_id;
    promptSource = acceptedEntry.is_community ? "community" : "personal";
    if (acceptedEntry.prompt_id) {
      const p = await db.prepare("SELECT id, prompt_text, category FROM writing_prompts WHERE id = ?").bind(acceptedEntry.prompt_id).first();
      if (p) currentPrompt = p;
    }
  } else if (passesUsed > 0) {
    promptSource = "personal";
    try {
      const lastPersonal = await db.prepare(
        "SELECT prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND is_community = 0 AND action = 'passed' ORDER BY created_at DESC LIMIT 1"
      ).bind(userId, today, locale).first();
      if (lastPersonal?.prompt_id) {
        const p = await db.prepare("SELECT id, prompt_text, category FROM writing_prompts WHERE id = ?").bind(lastPersonal.prompt_id).first();
        if (p) currentPrompt = p;
        else currentPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
      } else {
        currentPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
      }
    } catch (err) {
      console.error("Failed to load personal prompt:", err);
    }
  }
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
async function handleAction(db, ai, userId, action, locale = "en") {
  const today = getToday();
  if (action === "passed") {
    const passCount = await db.prepare(
      "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
    ).bind(userId, today, locale).first();
    const passesUsed = passCount?.count || 0;
    if (passesUsed >= DAILY_PASS_LIMIT) {
      return { error: "No passes remaining today", passesRemaining: 0 };
    }
    const communityPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
    await db.prepare(
      "INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), userId, communityPrompt.id, today, "passed", locale, 1).run();
    await updateStats(db, userId, "passed");
    const newPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
    const newRemaining = DAILY_PASS_LIMIT - passesUsed - 1;
    await db.prepare(
      "INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), userId, newPrompt.id, today, "passed", locale, 0).run();
    return {
      prompt: newPrompt,
      promptSource: "personal",
      passesRemaining: newRemaining,
      passesUsed: passesUsed + 1,
      action: "passed"
    };
  }
  if (action === "accepted") {
    console.log("🎯 ACCEPT - userId:", userId, "locale:", locale, "today:", today);
    const logs = await db.prepare(
      "SELECT action FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? ORDER BY created_at DESC"
    ).bind(userId, today, locale).all();
    const hasPassed = (logs.results || []).some((e) => e.action === "passed");
    let currentPrompt;
    let isCommunity;
    if (hasPassed) {
      const lastPersonal = await db.prepare(
        "SELECT prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND is_community = 0 AND action = 'passed' ORDER BY created_at DESC LIMIT 1"
      ).bind(userId, today, locale).first();
      if (lastPersonal?.prompt_id) {
        const p = await db.prepare("SELECT id, prompt_text, category FROM writing_prompts WHERE id = ?").bind(lastPersonal.prompt_id).first();
        currentPrompt = p || await getNewPromptForUser(db, ai, today, userId, locale);
      } else {
        currentPrompt = await getNewPromptForUser(db, ai, today, userId, locale);
      }
      isCommunity = 0;
    } else {
      currentPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
      isCommunity = 1;
    }
    await db.prepare(
      "INSERT INTO daily_prompt_log (id, user_id, prompt_id, prompt_date, action, locale, is_community) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), userId, currentPrompt.id, today, "accepted", locale, isCommunity).run();
    await updateStats(db, userId, "accepted");
    console.log("🎯 ACCEPT returning promptId:", currentPrompt.id);
    return {
      promptId: currentPrompt.id,
      prompt: currentPrompt,
      promptSource: isCommunity ? "community" : "personal",
      action: "accepted",
      passesRemaining: await getPassesRemaining(db, userId, today, locale)
    };
  }
  if (action === "completed") {
    await db.prepare(
      "UPDATE daily_prompt_log SET action = 'completed' WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'accepted'"
    ).bind(userId, today, locale).run();
    return { action: "completed" };
  }
  return { error: "Invalid action" };
}
async function getPassesRemaining(db, userId, dateStr, locale = "en") {
  const passCount = await db.prepare(
    "SELECT COUNT(*) as count FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ? AND action = 'passed' AND is_community = 1"
  ).bind(userId, dateStr, locale).first();
  return Math.max(0, DAILY_PASS_LIMIT - (passCount?.count || 0));
}
async function updateStats(db, userId, action, wordCount = 0) {
  const existing = await db.prepare(
    "SELECT * FROM user_writing_stats WHERE user_id = ?"
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
  if (action === "accepted" || action === "written") {
    if (lastDate === today) ;
    else if (lastDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    lastDate = today;
  }
  if (action === "accepted") promptsAccepted += 1;
  if (action === "passed") promptsPassed += 1;
  if (action === "written") {
    totalWritings += 1;
    totalWords += wordCount;
  }
  await db.prepare(
    `UPDATE user_writing_stats SET total_writings = ?, total_words = ?, current_streak = ?,
     longest_streak = ?, prompts_accepted = ?, prompts_passed = ?, last_writing_date = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(totalWritings, totalWords, currentStreak, longestStreak, promptsAccepted, promptsPassed, lastDate, userId).run();
  const stats = { total_writings: totalWritings, total_words: totalWords, current_streak: currentStreak, longest_streak: longestStreak };
  const newBadges = await checkAndUnlockBadges(db, userId, stats);
  return { stats, newBadges };
}
async function getStats(db, userId) {
  const row = await db.prepare("SELECT * FROM user_writing_stats WHERE user_id = ?").bind(userId).first();
  const writings = await db.prepare(
    "SELECT COUNT(*) as total, COALESCE(SUM(word_count), 0) as words FROM writings WHERE user_id = ? AND status = ?"
  ).bind(userId, "published").first();
  const totalWritings = writings?.total || 0;
  const totalWords = writings?.words || 0;
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
async function getUserWritings(db, userId, options = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 50);
  const offset = (page - 1) * limit;
  const visibility = options.visibility || null;
  let query = "SELECT w.*, wp.prompt_text FROM writings w LEFT JOIN writing_prompts wp ON w.prompt_id = wp.id WHERE w.user_id = ?";
  const binds = [userId];
  if (visibility) {
    query += " AND w.visibility = ?";
    binds.push(visibility);
  }
  const countBinds = [...binds];
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM writings w LEFT JOIN writing_prompts wp ON w.prompt_id = wp.id WHERE w.user_id = ?` + (visibility ? " AND w.visibility = ?" : "")
  ).bind(...countBinds).first();
  const total = countResult?.total || 0;
  query += " ORDER BY w.created_at DESC LIMIT ? OFFSET ?";
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
async function publishWriting(db, userId, { title, content, promptId, aiAssisted, visibility }) {
  const id = crypto.randomUUID();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  await db.prepare(
    `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))`
  ).bind(id, userId, promptId || null, title, content, wordCount, aiAssisted ? 1 : 0, visibility || "private").run();
  await updateStats(db, userId, "written", wordCount);
  return { id, wordCount };
}
async function saveDraft(db, userId, { title, content, promptId, aiAssisted, visualPromptText, visualArtworkUrl }) {
  const id = crypto.randomUUID();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  await db.prepare(
    `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, visual_prompt_text, visual_artwork_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'private', 'draft', ?, ?, datetime('now'), datetime('now'))`
  ).bind(id, userId, promptId || null, title, content, wordCount, aiAssisted ? 1 : 0, visualPromptText || null, visualArtworkUrl || null).run();
  await updateStats(db, userId, "written", wordCount);
  return { id, wordCount };
}
async function getPublicWritings(db, options = {}) {
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
    query += " AND w.locale = ?";
    binds.push(locale);
  }
  if (category) {
    query += " AND w.category = ?";
    binds.push(category);
  }
  if (author === "agents") {
    query += " AND u.role = 'agent'";
  } else if (author === "humans") {
    query += " AND u.role != 'agent'";
  }
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM writings w JOIN users u ON w.user_id = u.id WHERE w.visibility = 'public' AND w.status = 'published'` + (locale ? " AND w.locale = ?" : "") + (category ? " AND w.category = ?" : "") + (author === "agents" ? " AND u.role = 'agent'" : author === "humans" ? " AND u.role != 'agent'" : "")
  ).bind(...binds).first();
  const total = countResult?.total || 0;
  query += " ORDER BY w.created_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);
  const { results } = await db.prepare(query).bind(...binds).all();
  return { writings: results || [], total, page, pages: Math.ceil(total / limit) };
}
async function getCommunityResponses(db, options = {}) {
  const limit = Math.min(options.limit || 20, 50);
  const locale = options.locale || null;
  let dateQuery = `
    SELECT DISTINCT w.created_at as date
    FROM writings w
    JOIN writing_prompts wp ON w.prompt_id = wp.id
    JOIN users u ON w.user_id = u.id
    WHERE w.visibility = 'public' AND w.status = 'published' AND wp.category = 'daily-community'
  `;
  const dateBinds = [];
  if (locale) {
    dateQuery += " AND w.locale = ?";
    dateBinds.push(locale);
  }
  dateQuery += " ORDER BY date DESC LIMIT 30";
  const { results: dates } = await db.prepare(dateQuery).bind(...dateBinds).all();
  const groups = [];
  for (const row of dates || []) {
    const dateStr = row.date?.slice(0, 10);
    if (!dateStr) continue;
    const prompt = await db.prepare(
      "SELECT prompt_text FROM writing_prompts WHERE prompt_date = ? AND category = 'daily-community' LIMIT 1"
    ).bind(dateStr).first();
    let responseQuery = `
      SELECT w.id, w.title, w.content, w.word_count, w.ai_assisted, w.created_at, u.username, u.display_name
      FROM writings w
      JOIN writing_prompts wp ON w.prompt_id = wp.id
      JOIN users u ON w.user_id = u.id
      WHERE w.visibility = 'public' AND w.status = 'published' AND wp.category = 'daily-community'
        AND w.created_at LIKE ?
    `;
    const rBinds = [dateStr + "%"];
    if (locale) {
      responseQuery += " AND w.locale = ?";
      rBinds.push(locale);
    }
    responseQuery += " ORDER BY w.created_at DESC LIMIT ?";
    rBinds.push(limit);
    const { results: writings } = await db.prepare(responseQuery).bind(...rBinds).all();
    if (writings?.length > 0) {
      groups.push({ date: dateStr, prompt: prompt?.prompt_text || "", writings });
    }
  }
  return groups;
}
async function getUserProfile(db, username) {
  const user = await db.prepare(
    "SELECT id, username, email, role, created_at FROM users WHERE username = ?"
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
export {
  getPublicWritings as a,
  getStats as b,
  getTodayData as c,
  getUserWritings as d,
  getUserProfile as e,
  getCommunityResponses as g,
  handleAction as h,
  publishWriting as p,
  saveDraft as s
};
