// Projection mode — minimal loader
export async function load({ params, platform }) {
    const db = platform?.env?.DB_book;
    const portalId = params.id;

    if (!db) {
        return { portal: null, allPortals: [], sceneConfigs: {}, error: 'No DB' };
    }

    try {
        const portal = await db.prepare(
            'SELECT * FROM portals WHERE id = ? AND status = ?'
        ).bind(portalId, 'active').first();

        if (!portal) {
            return { portal: null, allPortals: [], sceneConfigs: {}, error: 'Not found: ' + portalId };
        }

        const { results: allPortals } = await db.prepare(
            'SELECT * FROM portals WHERE status = ? ORDER BY galaxy_id ASC, discovered_at ASC'
        ).bind('active').all();

        const { results: sceneRows } = await db.prepare(
            'SELECT portal_id, scene_config FROM portal_scenes'
        ).all();

        const sceneConfigs = {};
        for (const row of sceneRows || []) {
            try { sceneConfigs[row.portal_id] = JSON.parse(row.scene_config); } catch {}
        }

        return { portal, allPortals: allPortals || [], sceneConfigs };
    } catch (e) {
        return { portal: null, allPortals: [], sceneConfigs: {}, error: String(e) };
    }
}
