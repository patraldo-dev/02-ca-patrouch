/**
 * GET /api/portals/[id]/narration?locale=es
 *
 * Public read of a portal's pre-rendered narration. Returns the base64 mp3
 * audio + the text passage (for subtitles). No AI cost, no auth — like
 * fetching an image. Lets visitors hear narration without an account.
 *
 * Query params:
 *   locale — 'es' | 'en' | 'fr' (default: 'es')
 *
 * Response (200): { audio, format, text, locale, portal_id }
 * Response (404): no narration generated for this portal/locale yet.
 */

import { json } from '@sveltejs/kit';

const VALID_LOCALES = ['es', 'en', 'fr'];

export async function GET({ params, platform, url }) {
	const db = platform?.env?.DB_book;
	if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

	const { id } = params;
	let locale = url.searchParams.get('locale') || 'es';
	if (!VALID_LOCALES.includes(locale)) locale = 'es';

	try {
		const row = await db.prepare(
			`SELECT portal_id, locale, audio_base64, text_passage, generated_at
			 FROM portal_narrations WHERE portal_id = ? AND locale = ?`
		).bind(id, locale).first();

		if (!row || (!row.audio_base64 && !row.text_passage)) {
			return json({ error: 'No narration generated for this portal', portal_id: id, locale }, { status: 404 });
		}

		return json({
			portal_id: id,
			locale,
			audio: row.audio_base64 || null,
			format: 'mp3',
			text: row.text_passage || '',
			generated_at: row.generated_at,
		});
	} catch (e) {
		console.error(`narration [${id}] error:`, e);
		return json({ error: 'Failed to fetch narration' }, { status: 500 });
	}
}
