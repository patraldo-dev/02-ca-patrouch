/**
 * GET /api/portals/[id]/scene
 *
 * Read-only access to a portal's current (Mistral-generated) scene config.
 * No AI cost, no auth — intended for preview tools and the portal-engine dev
 * workspace to drink real generated configs safely.
 *
 * Optional query: ?portal_meta=1 to include the portal row (name/icon/colors)
 * alongside the scene, so a renderer has everything it needs in one fetch.
 *
 * Response (200): the parsed scene_config object, optionally under { scene, portal }.
 * Response (404): no stored scene for this portal.
 */

import { json } from '@sveltejs/kit';

export async function GET({ params, platform, url }) {
	const db = platform?.env?.DB_book;
	if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

	const { id } = params;
	const includeMeta = url.searchParams.get('portal_meta') === '1';

	try {
		const row = await db.prepare(
			`SELECT portal_id, scene_config, source_writings, generated_at
			 FROM portal_scenes WHERE portal_id = ?
			 ORDER BY generated_at DESC LIMIT 1`
		).bind(id).first();

		if (!row) {
			return json({ error: 'No scene config stored for this portal' }, { status: 404 });
		}

		let scene;
		try { scene = JSON.parse(row.scene_config); }
		catch { return json({ error: 'Stored scene config is not valid JSON' }, { status: 500 }); }

		if (!includeMeta) {
			return json(scene);
		}

		const portal = await db.prepare(
			`SELECT id, icon, color_primary, color_bg, color_text,
			        name_es, name_en, name_fr, triggers
			 FROM portals WHERE id = ?`
		).bind(id).first();

		if (portal) {
			try { portal.triggers = JSON.parse(portal.triggers || '[]'); } catch { portal.triggers = []; }
		}

		return json({
			scene,
			portal,
			source_writings: safeParse(row.source_writings),
			generated_at: row.generated_at,
		});
	} catch (e) {
		console.error(`scene [${id}] error:`, e);
		return json({ error: 'Failed to fetch scene' }, { status: 500 });
	}
}

function safeParse(s) {
	try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}
