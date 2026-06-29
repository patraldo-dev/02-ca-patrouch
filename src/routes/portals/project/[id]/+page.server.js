// Projection mode — ultra minimal, can't fail
export async function load({ params, platform }) {
    const portalId = params.id;
    const db = platform?.env?.DB_book;

    if (!db) {
        return { portal: null, allPortals: [], sceneConfigs: {}, errorMsg: 'No DB' };
    }

    // Get portal — explicit columns, no JOIN, no SELECT *
    let portal = null;
    try {
        portal = await db.prepare(
            'SELECT id, galaxy_id, icon, color_primary, color_bg, color_text, name_es, name_en, name_fr, description_es, description_en, description_fr, status, active_writings_count, narrator_greeting, narrator_tone, scene_image FROM portals WHERE id = ?'
        ).bind(portalId).first();
    } catch (e) {
        return { portal: null, allPortals: [], sceneConfigs: {}, errorMsg: 'Query1: ' + e.message };
    }

    if (!portal) {
        return { portal: null, allPortals: [], sceneConfigs: {}, errorMsg: 'Not found: ' + portalId };
    }

    // Get all portals
    let allPortals = [];
    try {
        const res = await db.prepare(
            'SELECT id, galaxy_id, icon, color_primary, name_es, name_en, name_fr, description_es, description_en, description_fr, active_writings_count, narrator_greeting, narrator_tone, scene_image FROM portals WHERE status = ?'
        ).bind('active').all();
        allPortals = res.results || [];
    } catch (e) {
        // Non-fatal
    }

    // Get scene configs
    let sceneConfigs = {};
    try {
        const res = await db.prepare('SELECT portal_id, scene_config FROM portal_scenes').all();
        for (const row of res.results || []) {
            try { sceneConfigs[row.portal_id] = JSON.parse(row.scene_config); } catch {}
        }
    } catch (e) {
        // Non-fatal
    }

    return { portal, allPortals, sceneConfigs };
}
