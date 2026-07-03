/**
 * POST /api/portals/[id]/generate-scene
 *
 * On-demand Mistral scene generation for a single portal. Same Mistral +
 * normalization pipeline as the daily cron, but immediate so you can iterate
 * without waiting for the cron, and scoped to one portal.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>   (keeps AI cost behind the secret)
 * AI:   platform.env.AI binding (@cf/mistralai/mistral-small-3.1-24b-instruct)
 *
 * Body (optional, JSON):
 *   { "writings": ["<writing-id>", ...], "force": true }
 *
 * - If `writings` is omitted: auto-match recent (last 30 days) published
 *   writings by the portal's triggers — same logic as the cron.
 * - `force` (default false): when false and fewer than 3 writings match, we
 *   return the existing config rather than generating from thin evidence.
 *   When true, generate from whatever matched (down to 1).
 *
 * Response: the generated (and stored) scene config.
 */

import { json } from '@sveltejs/kit';
import { generateSceneForPortal, matchWritingsByTriggers } from '$lib/server/scene-generator.js';

export async function POST({ params, platform, request }) {
	const auth = request.headers.get('authorization');
	const CRON_SECRET = await platform?.env?.CRON_SECRET?.get?.() ?? null;

	if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB_book;
	const ai = platform?.env?.AI;
	if (!db || !ai) {
		return json({ error: 'DB or AI binding unavailable' }, { status: 503 });
	}

	const { id } = params;

	let body = {};
	try {
		body = await request.json();
	} catch {
		// empty/non-JSON body is fine — fall back to trigger matching
		body = {};
	}
	const force = body.force === true;
	const requestedWritingIds = Array.isArray(body.writings) ? body.writings : null;

	try {
		// 1. Load the portal (need name/icon/colors/triggers).
		const portal = await db.prepare(
			`SELECT id, icon, color_primary, color_bg, triggers, name_es, name_en, name_fr
			 FROM portals WHERE id = ? AND status = 'active'`
		).bind(id).first();

		if (!portal) {
			return json({ error: 'Portal not found or inactive' }, { status: 404 });
		}

		let triggers = [];
		try { triggers = JSON.parse(portal.triggers || '[]'); } catch { triggers = []; }

		// 2. Resolve the writings to analyze.
		let sourceWritings;

		if (requestedWritingIds && requestedWritingIds.length > 0) {
			// Explicit list — fetch those ids (must be published).
			const placeholders = requestedWritingIds.map(() => '?').join(',');
			const { results } = await db.prepare(
				`SELECT id, title, content, locale FROM writings
				 WHERE status = 'published' AND id IN (${placeholders})`
			).bind(...requestedWritingIds).all();
			sourceWritings = results || [];
		} else {
			// Auto-match by triggers over the last 30 days.
			const { results: recent } = await db.prepare(
				`SELECT id, title, content, locale, category FROM writings
				 WHERE status = 'published' AND created_at > datetime('now', '-30 days')
				 ORDER BY created_at DESC LIMIT 50`
			).all();
			sourceWritings = matchWritingsByTriggers(recent || [], triggers, 8);
		}

		// 3. Guard: don't fabricate a scene from too little evidence.
		const minNeeded = force ? 1 : 3;
		if (sourceWritings.length < minNeeded) {
			// Return whatever config already exists rather than generating.
			const existing = await db.prepare(
				`SELECT scene_config FROM portal_scenes WHERE portal_id = ?`
			).bind(id).first();
			return json({
				message: `Only ${sourceWritings.length} writing(s) matched (need ${minNeeded}). Not generating.`,
				portal_id: id,
				scene_config: existing ? safeParse(existing.scene_config) : null,
			}, { status: 200 });
		}

		// 4. Generate + normalize + store.
		const { sceneConfig, sourceIds } = await generateSceneForPortal(ai, portal, sourceWritings);

		await db.prepare(
			`INSERT INTO portal_scenes (portal_id, scene_config, source_writings, generated_at)
			 VALUES (?, ?, ?, datetime('now'))
			 ON CONFLICT(portal_id) DO UPDATE SET
			   scene_config = excluded.scene_config,
			   source_writings = excluded.source_writings,
			   generated_at = excluded.generated_at`
		).bind(
			id,
			JSON.stringify(sceneConfig),
			JSON.stringify(sourceIds)
		).run();

		return json({
			success: true,
			portal_id: id,
			writings_analyzed: sourceIds.length,
			scene_config: sceneConfig,
		});
	} catch (e) {
		console.error(`generate-scene [${id}] error:`, e);
		return json({ error: 'Scene generation failed: ' + e.message }, { status: 500 });
	}
}

function safeParse(s) {
	try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}
