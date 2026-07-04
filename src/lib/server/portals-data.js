/**
 * Shared SSR data loading for the portals spatial experience.
 *
 * Used by both:
 *   - src/routes/portals/+page.server.js        (the index/landing world)
 *   - src/routes/portals/[id]/+page.server.js   (direct links to a portal)
 *
 * Both routes boot the same engine; the only difference is which portal the
 * engine starts in. Keeping the load logic here means the two pages can never
 * drift apart on what data they provide to the renderer.
 */

/**
 * Load galaxies, portals, and Mistral-generated scene configs from D1.
 * Returns a safe empty shape if the DB binding is missing or the query fails,
 * so a missing binding never crashes the page — it just renders with fallbacks.
 *
 * @param {D1Database} db - platform.env.DB_book
 * @returns {Promise<{ galaxies: Array, portals: Array, count: number, featuredPortal: object|null, sceneConfigs: object }>}
 */
export async function loadPortalsData(db) {
	if (!db) {
		return { galaxies: [], portals: [], count: 0, featuredPortal: null, sceneConfigs: {} };
	}

	try {
		const { results: portals } = await db.prepare(`
			SELECT
				p.id, p.galaxy_id, p.icon, p.color_primary, p.color_bg, p.color_text,
				p.name_es, p.name_en, p.name_fr,
				p.description_es, p.description_en, p.description_fr,
				p.status, p.active_writings_count, p.video_url,
				p.narrator_greeting, p.narrator_tone,
				p.scene_image,
				g.name_es as galaxy_name_es, g.name_en as galaxy_name_en, g.name_fr as galaxy_name_fr,
				g.icon as galaxy_icon, g.sort_order as galaxy_sort
			FROM portals p
			JOIN galaxies g ON p.galaxy_id = g.id
			WHERE p.status = 'active'
			ORDER BY g.sort_order ASC, p.discovered_at ASC
		`).all();

		// Fetch scene configs (Mistral-generated, stored by the cron/architect).
		// A portal may have multiple variants; pick the most recent per portal.
		const { results: sceneRows } = await db.prepare(`
			SELECT portal_id, scene_config FROM portal_scenes
			WHERE (portal_id, generated_at) IN (
				SELECT portal_id, MAX(generated_at) FROM portal_scenes GROUP BY portal_id
			)
		`).all();
		const sceneConfigs = {};
		for (const row of sceneRows || []) {
			try { sceneConfigs[row.portal_id] = JSON.parse(row.scene_config); } catch {}
		}

		// Featured = most active writings, fallback to first
		const featuredPortal = (portals && portals.length > 0)
			? [...portals].sort((a, b) => (b.active_writings_count || 0) - (a.active_writings_count || 0))[0]
			: null;

		// Group by galaxy
		const galaxyMap = {};
		for (const p of portals || []) {
			if (!galaxyMap[p.galaxy_id]) {
				galaxyMap[p.galaxy_id] = {
					id: p.galaxy_id,
					name_es: p.galaxy_name_es,
					name_en: p.galaxy_name_en,
					name_fr: p.galaxy_name_fr,
					icon: p.galaxy_icon,
					sort_order: p.galaxy_sort,
					portals: []
				};
			}
			galaxyMap[p.galaxy_id].portals.push(p);
		}

		return {
			galaxies: Object.values(galaxyMap),
			portals: portals || [],
			count: portals?.length || 0,
			featuredPortal,
			sceneConfigs,
		};
	} catch (e) {
		console.error('Portals load error:', e);
		return { galaxies: [], portals: [], count: 0, featuredPortal: null, sceneConfigs: {} };
	}
}

/**
 * Pick a random portal id from the loaded data. Used by /portals to land the
 * visitor in a surprise world each visit — every world is itself a navigable
 * menu (gateways to all other portals), so there's no dedicated index.
 *
 * Prefers portals that have a Mistral-generated scene config (fresh, rich
 * content). Falls back to any active portal if none have configs yet.
 *
 * @param {object} data - result of loadPortalsData
 * @returns {string|null} a portal id, or null if there are no portals
 */
export function pickRandomPortalId(data) {
	const withScenes = (data.portals || []).filter((p) => data.sceneConfigs?.[p.id]);
	const pool = withScenes.length ? withScenes : (data.portals || []);
	if (!pool.length) return null;
	return pool[Math.floor(Math.random() * pool.length)].id;
}
