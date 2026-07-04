/**
 * Portal narration generation — Mistral passage + melotts audio pre-render.
 *
 * Two phases:
 *   1. generateNarrationText(ai, portal, writings) → { es, en, fr } passages
 *      A dedicated Mistral call (separate from scene-config) that produces a
 *      ~150-250 word story-like narration per locale, in the portal's mood
 *      (using the personality columns: tone, vocabulary, proclamation_style).
 *   2. renderNarrationAudio(ai, text) → base64 mp3 via melotts
 *      Pre-renders a passage to audio so playback is instant.
 *
 * The orchestrator (portal-architect.js) calls generateNarrationForPortal
 * after enhance_scene / birth_portal, which does phase 1 + renders all three
 * locales + stores them in portal_narrations.
 */

const MISTRAL_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const MELOTTS_MODEL = '@cf/myshell-ai/melotts';
const MAX_PASSAGE_CHARS = 1500;

/**
 * Generate the narration text — a story-like passage per locale, in the
 * portal's mood, derived from its associated writings.
 *
 * @param {object} ai        - platform.env.AI
 * @param {object} portal    - portal row (needs name_es, narrator_* columns)
 * @param {Array}  writings  - associated writings ({ title, content, locale })
 * @returns {Promise<{es:string, en:string, fr:string}>}
 */
export async function generateNarrationText(ai, portal, writings) {
	// Wider excerpts than the scene-config call: 400 chars each, up to 6.
	const excerpts = (writings || []).slice(0, 6).map((w, i) => {
		const text = (w.content || '').replace(/\s+/g, ' ').trim();
		return `(${i + 1}) ${w.title || 'Sin título'}: ${text.substring(0, 400)}`;
	}).join('\n\n');

	// Mood from the personality columns (these exist on every portal but are
	// otherwise unused — exactly the "voice" hook this feature needs).
	const tone = portal.narrator_tone || 'contemplativo';
	const vocabulary = (() => {
		try { return JSON.parse(portal.narrator_vocabulary || '[]'); } catch { return []; }
	})();
	const proclamation = portal.narrator_proclamation_style || '';
	const greeting = portal.narrator_greeting || '';
	const name = portal.name_es || portal.id;

	const prompt = `Eres el narrador del portal "${name}", un mundo literario inmersivo.

Tu personalidad:
- Tono: ${tone}
- Estilo de proclamación: ${proclamation}
- Vocabulario característico: ${vocabulary.join(', ')}
- Saludo habitual: ${greeting}

Las escrituras asociadas a este portal:
${excerpts}

Reinterpreta estas escrituras como una NARRACIÓN en prosa — no resumas, no cites literalmente. Teje una voz narrativa corta (100-200 palabras por idioma) que capture la esencia emocional y temática. Debe sentirse como una historia que se desenvuelve, como si el portal mismo hablara. Empieza con algo evocador, desarrolla, termina con resonancia.

Genera la narración en TRES idiomas como JSON:
{
  "es": "narración en español...",
  "en": "narration in English...",
  "fr": "narration en français..."
}

Solo el JSON, sin markdown ni explicación. Cada pasada debe ser una traducción/adaptación fiel de la misma narración, no tres narraciones diferentes.`;

	const aiResponse = await ai.run(MISTRAL_MODEL, {
		messages: [{ role: 'user', content: prompt }],
		max_tokens: 1800,
		temperature: 0.75,
	});

	let text = aiResponse.response || aiResponse.result?.response || '';
	text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

	let passages;
	try {
		passages = JSON.parse(text);
	} catch {
		const m = text.match(/\{[\s\S]*\}/);
		if (m) {
			try { passages = JSON.parse(m[0]); } catch { passages = {}; }
		} else {
			passages = {};
		}
	}

	// Sanitize + cap each locale, with sensible fallbacks.
	const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, MAX_PASSAGE_CHARS) : '');
	const es = clean(passages.es) || clean(passages.en) || `Bienvenido a ${name}.`;
	const en = clean(passages.en) || es;
	const fr = clean(passages.fr) || es;
	return { es, en, fr };
}

/**
 * Render a text passage to audio via melotts (Workers AI, free).
 * @returns {Promise<string|null>} base64 mp3, or null on failure
 */
export async function renderNarrationAudio(ai, text) {
	if (!ai || !text || text.trim().length < 10) return null;
	try {
		const result = await ai.run(MELOTTS_MODEL, { prompt: text.trim().slice(0, 2000) });
		if (result?.audio) return result.audio;
		console.warn('[narration] melotts returned no audio');
		return null;
	} catch (err) {
		console.error('[narration] melotts failed:', err.message);
		return null;
	}
}

/**
 * Full narration pipeline for a portal: generate text + render all 3 locales.
 * Stores results in the portal_narrations table.
 *
 * @param {object} opts - { db, ai, portal, writings }
 * @returns {Promise<{ portal_id, locales: string[], text: object, rendered: string[] }>}
 */
export async function generateNarrationForPortal({ db, ai, portal, writings }) {
	if (!db || !ai) throw new Error('generateNarrationForPortal: db and ai required');

	const text = await generateNarrationText(ai, portal, writings);

	const rendered = [];
	for (const locale of ['es', 'en', 'fr']) {
		const passage = text[locale];
		const audio = await renderNarrationAudio(ai, passage);
		await db.prepare(
			`INSERT INTO portal_narrations (portal_id, locale, audio_base64, text_passage, generated_at)
			 VALUES (?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(portal_id, locale) DO UPDATE SET
			   audio_base64 = excluded.audio_base64,
			   text_passage = excluded.text_passage,
			   generated_at = excluded.generated_at`
		).bind(portal.id, locale, audio || '', passage).run();
		rendered.push(locale);
	}

	return {
		portal_id: portal.id,
		locales: ['es', 'en', 'fr'],
		text,
		rendered,
	};
}
