// Projection mode — loads a single portal + all portal IDs for loop cycling
export async function load({ params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return { portal: null, allPortals: [], sceneConfigs: {} };

    const portalId = params.id;

    try {
        // Fetch the requested portal
        const portal = await db.prepare(`
            SELECT 
                p.id, p.galaxy_id, p.icon, p.color_primary, p.color_bg, p.color_text,
                p.name_es, p.name_en, p.name_fr,
                p.description_es, p.description_en, p.description_fr,
                p.status, p.active_writings_count, p.video_url,
                p.narrator_greeting, p.narrator_tone,
                p.scene_image
            FROM portals p
            WHERE p.id = ? AND p.status = 'active'
        `).bind(portalId).first();

        if (!portal) {
            console.error('[projection] Portal not found:', portalId);
            return { portal: null, allPortals: [], sceneConfigs: {} };
        }

        // Fetch all active portals for loop mode
        const { results: allPortals } = await db.prepare(`
            SELECT 
                id, galaxy_id, icon, color_primary, color_bg, color_text,
                name_es, name_en, name_fr,
                description_es, description_en, description_fr,
                status, active_writings_count, video_url,
                narrator_greeting, narrator_tone, scene_image
            FROM portals
            WHERE status = 'active'
            ORDER BY galaxy_id ASC, discovered_at ASC
        `).all();

        // Fetch scene config for this portal
        const sceneRow = await db.prepare(`
            SELECT scene_config FROM portal_scenes WHERE portal_id = ?
        `).bind(portalId).first();
        
        let sceneConfig = null;
        if (sceneRow?.scene_config) {
            try { sceneConfig = JSON.parse(sceneRow.scene_config); } catch {}
        }

        // Also fetch all scene configs (for loop mode)
        const { results: sceneRows } = await db.prepare(`
            SELECT portal_id, scene_config FROM portal_scenes
        `).all();
        const sceneConfigs = {};
        for (const row of sceneRows || []) {
            try { sceneConfigs[row.portal_id] = JSON.parse(row.scene_config); } catch {}
        }

        return {
            portal,
            allPortals: allPortals || [],
            sceneConfig,
            sceneConfigs,
        };
    } catch (e) {
        console.error('Projection load error:', e);
        return { portal: null, allPortals: [], sceneConfigs: {} };
    }
}
