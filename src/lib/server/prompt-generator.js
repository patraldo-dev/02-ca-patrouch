const CATEGORIES = [
  'fiction', 'poetry', 'memoir', 'sci-fi',
  'mystery', 'romance', 'fantasy', 'creative non-fiction'
];

function getCategoryForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return CATEGORIES[d.getDate() % CATEGORIES.length];
}

function rotateCategory(dateStr, offset) {
  const idx = (getCategoryForDate(dateStr).offset + (offset || 0)) % CATEGORIES.length;
  return CATEGORIES[idx >= 0 ? idx : idx + CATEGORIES.length];
}

export async function getOrCreateDailyPrompt(db, ai, dateStr, categoryOverride) {
  // Check if we already have a prompt for this date+category
  const category = categoryOverride || getCategoryForDate(dateStr);
  const existing = await db.prepare(
    'SELECT id, prompt_text, category FROM writing_prompts WHERE prompt_date = ? AND category = ? LIMIT 1'
  ).bind(dateStr, category).first();

  if (existing) return existing;

  // Generate new prompt via AI
  const promptText = await generatePromptWithAI(ai, category);

  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO writing_prompts (id, prompt_text, prompt_date, category) VALUES (?, ?, ?, ?)'
  ).bind(id, promptText, dateStr, category).run();

  return { id, prompt_text: promptText, category };
}

export async function getNewPromptForUser(db, ai, dateStr, userId) {
  // Get prompts already shown to this user today
  const shown = await db.prepare(
    'SELECT prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ?'
  ).bind(userId, dateStr).all();
  const shownIds = new Set(shown.results.map(r => r.prompt_id));

  // Try each category until we find one not yet shown (max 8 attempts = all categories)
  const baseIdx = new Date(dateStr + 'T12:00:00').getDate() % CATEGORIES.length;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[(baseIdx + i) % CATEGORIES.length];
    const prompt = await getOrCreateDailyPrompt(db, ai, dateStr, cat);
    if (!shownIds.has(prompt.id)) return prompt;
  }

  // All categories exhausted — generate a fresh one with random category
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const prompt = await getOrCreateDailyPrompt(db, ai, dateStr, cat);

  // Force a second generation attempt by appending date to make unique
  if (shownIds.has(prompt.id)) {
    return getOrCreateDailyPrompt(db, ai, dateStr, CATEGORIES[(baseIdx + 1) % CATEGORIES.length]);
  }

  return prompt;
}

export async function generatePromptWithAI(ai, category) {
  const systemPrompt = `You are a creative writing prompt generator. Generate a single, inspiring writing prompt for the "${category}" genre. The prompt should be 1-3 sentences, vivid, and thought-provoking. Output ONLY the prompt text, nothing else.`;

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Give me a creative writing prompt in the ${category} genre.` }
    ],
    max_tokens: 150,
    temperature: 0.9
  });

  return response.response?.trim() || `Write a ${category} piece about a moment that changed everything.`;
}

export { CATEGORIES, getCategoryForDate };
