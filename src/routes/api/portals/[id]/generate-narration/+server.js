/**
 * POST /api/portals/[id]/generate-narration
 *
 * On-demand narration generation for a single portal. Generates the
 * story-like text passage per locale (Mistral) + pre-renders melotts audio,
 * stores both in portal_narrations. Also merges the narration text into the
 * portal's default scene config (so subtitles can read it from the config).
 *
 * Auth: logged-in session with role 'admin' or 'editor' (requireRole).
 *       The Mistral + TTS calls cost neurons/time; gate it.
 * AI:   platform.env.AI binding.
 *
 * Response: the generated narration summary.
 */

import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role.js';
import { generateNarrationForPortal } from '$lib/server/generate-narration.js';
import { matchWritingsByTriggers } from '$lib/server/scene-generator.js';

export async function POST({ params, platform, request, locals, url }) {
	// Human-action auth (same pattern as generate-scene).
	try {
		await requireRole(locals, ['admin', 'editor'], url);
	} catch (e) {
		if (e?.status === 303 || e?.status === 302) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}
		if (e?.status === 403) {
			return json({ error: 'Editor or admin access required' }, { status: 403 });
		}
		throw e;
	}

	const db = platform?.env?.DB_book;
	const ai = platform?.env?.AI;
	if (!db || !ai) {
		return json({ error: 'DB or AI binding unavailable' }, { status: 503 });
	}

	const { id } = params;

	try {
		// Load the portal (needs narrator_* personality columns for mood).
		const portal = await db.prepare(
			`SELECT id, icon, color_primary, color_bg, name_es, name_en, name_fr,
			        narrator_tone, narrator_vocabulary, narrator_proclamation_style, narrator_greeting, triggers
			 FROM portals WHERE id = ? AND status = 'active'`
		).bind(id).first();

		if (!portal) {
			return json({ error: 'Portal not found or inactive' }, { status: 404 });
		}
		try { portal.triggers = JSON.parse(portal.triggers || '[]'); } catch { portal.triggers = []; }

		// Resolve writings: auto-match by triggers over last 30 days.
		const { results: recent } = await db.prepare(
			`SELECT id, title, content, locale FROM writings
			 WHERE status = 'published' AND created_at > datetime('now', '-30 days')
			 ORDER BY created_at DESC LIMIT 50`
		).all();
		const writings = matchWritingsByTriggers(recent || [], portal.triggers, 8);
		if (writings.length < 1) {
			return json({ error: 'No writings match this portal — cannot generate narration' }, { status: 400 });
		}

		// Generate + render.
		const result = await generateNarrationForPortal({ db, ai, portal, writings });

		// Merge the narration text into the portal's default scene config so
		// subtitles can read it from the config (the audio lives in portal_narrations).
		const sceneRow = await db.prepare(
			`SELECT scene_config FROM portal_scenes WHERE portal_id = ? AND variant = 'default'`
		).bind(id).first();
		if (sceneRow?.scene_config) {
			try {
				const cfg = JSON.parse(sceneRow.scene_config);
				cfg.narration = result.text;
				await db.prepare(
					`UPDATE portal_scenes SET scene_config = ? WHERE portal_id = ? AND variant = 'default'`
				).bind(JSON.stringify(cfg), id).run();
			} catch {}
		}

		return json({
			success: true,
			portal_id: id,
			locales: result.locales,
			rendered: result.rendered,
			text_preview: {
				es: (result.text.es || '').slice(0, 120),
				en: (result.text.en || '').slice(0, 120),
				fr: (result.text.fr || '').slice(0, 120),
			},
		});
	} catch (e) {
		console.error(`generate-narration [${id}] error:`, e);
		return json({ error: 'Narration generation failed: ' + e.message }, { status: 500 });
	}
}
