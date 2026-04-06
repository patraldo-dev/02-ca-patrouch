const CATEGORIES = [
  'fiction', 'poetry', 'memoir', 'sci-fi',
  'mystery', 'romance', 'fantasy', 'creative non-fiction'
];

const LOCALE_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French'
};

function getCategoryForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return CATEGORIES[d.getDate() % CATEGORIES.length];
}

export async function getOrCreateDailyPrompt(db, ai, dateStr, categoryOverride, locale = 'en') {
  const category = categoryOverride || getCategoryForDate(dateStr);
  const existing = await db.prepare(
    'SELECT id, prompt_text, category FROM writing_prompts WHERE prompt_date = ? AND category = ? AND locale = ? LIMIT 1'
  ).bind(dateStr, category, locale).first();

  if (existing) return existing;

  const promptText = await generatePromptWithAI(ai, category, locale);
  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO writing_prompts (id, prompt_text, prompt_date, category, locale) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, promptText, dateStr, category, locale).run();

  return { id, prompt_text: promptText, category };
}

export async function getNewPromptForUser(db, ai, dateStr, userId, locale = 'en') {
  const shown = await db.prepare(
    'SELECT prompt_id FROM daily_prompt_log WHERE user_id = ? AND prompt_date = ? AND locale = ?'
  ).bind(userId, dateStr, locale).all();
  const shownIds = new Set(shown.results.map(r => r.prompt_id));

  const baseIdx = new Date(dateStr + 'T12:00:00').getDate() % CATEGORIES.length;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[(baseIdx + i) % CATEGORIES.length];
    const prompt = await getOrCreateDailyPrompt(db, ai, dateStr, cat, locale);
    if (!shownIds.has(prompt.id)) return prompt;
  }

  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  return getOrCreateDailyPrompt(db, ai, dateStr, cat, locale);
}

export async function getOrCreateCommunityPrompt(db, ai, dateStr, locale = 'en') {
  const existing = await db.prepare(
    "SELECT id, prompt_text, category FROM writing_prompts WHERE prompt_date = ? AND locale = ? AND category = 'daily-community' LIMIT 1"
  ).bind(dateStr, locale).first();

  if (existing) return existing;

  const promptText = await generatePromptWithAI(ai, 'daily-community', locale);
  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO writing_prompts (id, prompt_text, prompt_date, category, locale) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, promptText, dateStr, 'daily-community', locale).run();

  return { id, prompt_text: promptText, category: 'daily-community' };
}

export async function generatePromptWithAI(ai, category, locale = 'en') {
  const lang = LOCALE_LANGUAGES[locale] || 'English';
  const isCommunity = category === 'daily-community';
  const genreDesc = isCommunity ? 'a genre of your choosing (vary it — fiction, poetry, memoir, sci-fi, etc.)' : `the "${category}" genre`;
  const systemPrompt = `You are a creative writing prompt generator. Generate a single, inspiring writing prompt for ${genreDesc}. The prompt should be 1-3 sentences, vivid, and thought-provoking. You MUST output the prompt in ${lang} ONLY. Do NOT include any translation, parenthetical translation, or bilingual text. Output ONLY the prompt text, nothing else.`;

  try {
    const response = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Give me a creative writing prompt in the ${category} genre. Reply in ${lang} only. Do not include any translation.` }
      ],
      max_tokens: 150,
      temperature: 0.9
    });

    return response.response?.trim() || getFallback(category, locale);
  } catch (err) {
    console.error('AI prompt generation failed:', err);
    return getFallback(category, locale);
  }
}

function getFallback(category, locale = 'en') {
  const fallbacks = {
    en: {
      fiction: 'A letter arrives at your door, written in your own handwriting, dated ten years from now.',
      poetry: 'Describe the sound of a color no one else can see.',
      memoir: 'The meal that changed your understanding of home.',
      'sci-fi': 'Humanity receives a reply to its first interstellar message — but it\'s in a language we invented as a joke.',
      mystery: 'A painting in a museum changes slightly every night. Only you notice.',
      romance: 'Two strangers keep finding each other\'s lost things.',
      fantasy: 'The last dragon is small enough to fit in your pocket, and it has opinions.',
      'creative non-fiction': 'Write about a place that exists differently in memory than in reality.'
    },
    es: {
      fiction: 'Una carta llega a tu puerta, escrita con tu propia letra, fechada diez años en el futuro.',
      poetry: 'Describe el sonido de un color que nadie más puede ver.',
      memoir: 'La comida que cambió tu comprensión del hogar.',
      'sci-fi': 'La humanidad recibe una respuesta a su primer mensaje interestelar — pero está en un idioma que inventamos como broma.',
      mystery: 'Un cuadro en un museo cambia ligeramente cada noche. Solo tú lo notas.',
      romance: 'Dos desconocidos siguen encontrando las cosas perdidas del otro.',
      fantasy: 'El último dragón es lo bastante pequeño para caber en tu bolsillo, y tiene opiniones.',
      'creative non-fiction': 'Escribe sobre un lugar que existe diferente en la memoria que en la realidad.'
    },
    fr: {
      fiction: 'Une lettre arrive à votre porte, écrite de votre propre main, datée de dix ans dans le futur.',
      poetry: 'Décrivez le son d\'une couleur que personne d\'autre ne peut voir.',
      memoir: 'Le repas qui a changé votre compréhension du foyer.',
      'sci-fi': 'L\'humanité reçoit une réponse à son premier message interstellaire — mais c\'est dans une langue que nous avons inventée pour plaisanter.',
      mystery: 'Un tableau dans un musée change légèrement chaque nuit. Vous seul le remarquez.',
      romance: 'Deux inconnus ne cessent de retrouver les choses perdues de l\'autre.',
      fantasy: 'Le dernier dragon est assez petit pour tenir dans votre poche, et il a des opinions.',
      'creative non-fiction': 'Écrivez sur un lieu qui existe différemment dans la mémoire que dans la réalité.'
    }
  };
  return (fallbacks[locale] && fallbacks[locale][category]) || (fallbacks.en[category]) || 'Write about something you almost said but didn\'t.';
}

export { CATEGORIES, getCategoryForDate };
