import { json } from "@sveltejs/kit";
const STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "but",
  "and",
  "or",
  "if",
  "while",
  "about",
  "up",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "es",
  "son",
  "era",
  "ser",
  "estar",
  "estaba",
  "tiene",
  "tienen",
  "puede",
  "hacer",
  "que",
  "de",
  "en",
  "por",
  "para",
  "con",
  "sin",
  "sobre",
  "entre",
  "hacia",
  "desde",
  "como",
  "pero",
  "mas",
  "muy",
  "ya",
  "no",
  "si",
  "o",
  "y",
  "a",
  "se",
  "su",
  "sus",
  "mi",
  "tu",
  "nos",
  "les",
  "le",
  "lo",
  "este",
  "esta",
  "ese",
  "esa",
  "donde",
  "cuando",
  "porque",
  "une",
  "sont",
  "était",
  "être",
  "avoir",
  "ont",
  "fait",
  "peut",
  "dans",
  "pour",
  "sur",
  "avec",
  "sans",
  "entre",
  "vers",
  "depuis",
  "comme",
  "mais",
  "plus",
  "moins",
  "très",
  "déjà",
  "non",
  "ou",
  "et",
  "son",
  "sa",
  "ses",
  "mon",
  "notre",
  "votre",
  "leur",
  "ce",
  "cette",
  "said",
  "just",
  "into",
  "could",
  "would",
  "them",
  "than",
  "their",
  "which",
  "about",
  "upon",
  "shall"
]);
function weightKeyword(word) {
  let score = 5;
  if (word.length >= 10) score += 8;
  else if (word.length >= 7) score += 5;
  else if (word.length >= 5) score += 2;
  if (word.includes("-") || word.includes("'")) score += 3;
  const unusual = word.match(/[xjqzvkw]/gi);
  score += (unusual?.length || 0) * 2;
  const syllables = word.match(/[aeiouáéíóúàèìòùâêîôûäëïöüy]+/gi)?.length || 0;
  if (syllables >= 4) score += 4;
  else if (syllables >= 3) score += 2;
  const triteSuffixes = ["tion", "ment", "ing", "ness", "able", "ible", "ous", "ive", "ful", "less"];
  if (!triteSuffixes.some((s) => word.endsWith(s)) && word.length >= 6) score += 3;
  return Math.min(score, 30);
}
async function POST({ request, locals }) {
  const db = locals.db;
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { word, writing_id } = await request.json();
    if (!word || !writing_id) return json({ error: "word and writing_id required" }, { status: 400 });
    const clean = word.trim().toLowerCase().replace(/[^\p{L}]/gu, "");
    if (clean.length < 4) return json({ error: "Too short — minimum 4 letters" }, { status: 400 });
    if (STOP_WORDS.has(clean)) return json({ error: "Common word — not accepted" }, { status: 400 });
    const writing = await db.prepare(
      `SELECT id, user_id, status, content, title FROM writings WHERE id = ? AND status = 'published'`
    ).bind(writing_id).first();
    if (!writing) return json({ error: "Writing not found or not published" }, { status: 404 });
    if (writing.user_id !== locals.user.id) return json({ error: "Not your writing" }, { status: 403 });
    const text = ((writing.title || "") + " " + (writing.content || "")).toLowerCase();
    const textWords = new Set(text.match(new RegExp("\\p{L}{4,}", "gu")) || []);
    if (!textWords.has(clean)) return json({ error: "Word not found in this writing" }, { status: 400 });
    const existingForWriting = await db.prepare(
      `SELECT id FROM bq_keyword_proposals WHERE source_writing_id = ?`
    ).bind(writing_id).first();
    if (existingForWriting) return json({ error: "This writing already contributed a keyword" }, { status: 409 });
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayCount = await db.prepare(
      `SELECT COUNT(*) as c FROM bq_keyword_proposals WHERE player_id = ? AND proposal_date = ?`
    ).bind(locals.user.id, today).first();
    if (todayCount?.c > 0) return json({ error: "You already chose a keyword today" }, { status: 429 });
    const wordActive = await db.prepare(
      `SELECT id FROM bq_keyword_proposals WHERE word = ? AND status = 'pending'`
    ).bind(clean).first();
    if (wordActive) return json({ error: "Word already in the hidden pool" }, { status: 409 });
    const points = weightKeyword(clean);
    await db.prepare(
      `INSERT INTO bq_keyword_proposals (player_id, word, source_writing_id, points_earned) VALUES (?, ?, ?, ?)`
    ).bind(locals.user.id, clean, writing_id, points).run();
    return json({
      message: "Keyword deployed!",
      word: clean,
      points,
      writing_id
    });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
export {
  POST
};
