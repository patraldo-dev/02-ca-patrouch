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

  // Variation pools for maximum diversity
  const perspectives = ['first person', 'second person', 'third person limited', 'third person omniscient', 'epistolary (letters/diary)', 'unreliable narrator', 'stream of consciousness', 'reverse chronological'];
  const tones = ['darkly comic', 'melancholic', 'hopeful', 'unsettling', 'wistful', 'absurdist', 'tender', 'surreal', 'gritty', 'whimsical', 'ironic', 'lyrical', 'matter-of-fact'];
  const constraints = ['under 500 words', 'using only dialogue', 'without using the letter "e"', 'as a single paragraph', 'ending mid-sentence', 'as a list', 'starting with the last word', 'without any dialogue', 'as a series of questions', 'in exactly three sentences', 'starting in medias res', 'from the perspective of an inanimate object'];
  const themes = ['memory and forgetting', 'a secret kept too long', 'an unexpected inheritance', 'a conversation overheard', 'something found in an old coat pocket', 'the last day of a job', 'a neighbor nobody talks to', 'a tradition nobody remembers starting', 'a sound that triggers a memory', 'the smell of a specific place', 'a door that should not be opened', 'a recipe with a hidden ingredient', 'a photograph nobody can explain', 'a promise made to a stranger', 'the thing you said at the wrong moment', 'an animal that appears at a critical moment', 'a map to somewhere that no longer exists', 'a language only two people speak', 'the difference between leaving and escaping', 'something borrowed and never returned'];
  const genres = isCommunity ? ['fiction', 'poetry', 'memoir', 'sci-fi', 'mystery', 'romance', 'fantasy', 'horror', 'thriller', 'literary fiction', 'speculative fiction', 'historical fiction', 'magical realism', 'creative non-fiction', 'flash fiction'] : [category];

  // Seed variation from date to ensure daily uniqueness
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);

  const pick = (arr) => arr[(seed + Math.floor(Math.random() * arr.length)) % arr.length];
  const genre = pick(genres);
  const perspective = pick(perspectives);
  const tone = pick(tones);
  const theme = pick(themes);
  const hasConstraint = Math.random() > 0.4;
  const constraint = hasConstraint ? pick(constraints) : null;

  let userPrompt = `Give me a creative writing prompt in the ${genre} genre.`;
  userPrompt += ` Write it ${perspective}.`;
  userPrompt += ` The tone should be ${tone}.`;
  userPrompt += ` The theme or starting point is: ${theme}.`;
  if (constraint) userPrompt += ` Additional challenge: write it ${constraint}.`;
  userPrompt += ` Reply in ${lang} only. Output ONLY the prompt text, nothing else.`;

  const systemPrompt = `You are a creative writing prompt generator for an adult literary community. Generate ONE vivid, original writing prompt (1-3 sentences). Each prompt must feel fresh and specific — avoid generic "write about X" formulas. Instead, create a concrete scene, situation, or constraint that sparks a unique story. You MUST output in ${lang} ONLY. No translations, no parenthetical translations, no bilingual text. Output ONLY the prompt text.`;

  try {
    const response = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 1.2
    });

    let text = response.response?.trim() || getFallback(category, locale);
    // Strip parenthetical translations (any language)
    text = text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    // Strip quotes wrapping the entire text
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    if (text.startsWith("'") && text.endsWith("'")) text = text.slice(1, -1);
    return text;
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
