// Projection mode — loads a single portal + all portal IDs for loop cycling
import { error } from '@sveltejs/kit';

export async function load({ params, platform }) {
    const portalId = params.id;
    console.log('[projection] load() called, portalId:', portalId);
    console.log('[projection] platform exists:', !!platform);
    console.log('[projection] platform.env exists:', !!platform?.env);

    const db = platform?.env?.DB_book;
    console.log('[projection] DB_book exists:', !!db);

    if (!db) {
        console.error('[projection] No DB_book available');
        return { portal: null, allPortals: [], sceneConfigs: {}, error: 'No database' };
    }

    try {
        // Fetch the requested portal — same pattern as enter/[id] which works
        const portal = await db.prepare(`
            SELECT id, galaxy_id, icon, color_primary, color_bg, color_text,
                   name_es, name_en, name_fr,
                   description_es, description_en, description_fr,
                   status, active_writings_count, video_url,
                   narrator_greeting, narrator_tone, scene_image
            FROM portals WHERE id = ? AND status = 'active'
        `).bind(portalId).first();

        console.log('[projection] portal query result:', portal ? `found ${portal.id}` : 'NOT FOUND');

        if (!portal) {
            console.error('[projection] Portal not found:', portalId);
            return { portal: null, allPortals: [], sceneConfigs: {}, error: 'Portal not found: ' + portalId };
        }

        // Fetch all active portals for loop mode
        const { results: allPortals } = await db.prepare(`
            SELECT id, galaxy_id, icon, color_primary, color_bg, color_text,
                   name_es, name_en, name_fr,
                   description_es, description_en, description_fr,
                   status, active_writings_count, video_url,
                   narrator_greeting, narrator_tone, scene_image
            FROM portals WHERE status = 'active'
            ORDER BY galaxy_id ASC, discovered_at ASC
        `).all();

        console.log('[projection] allPortals count:', allPortals?.length);

        // Fetch all scene configs
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
            sceneConfigs,
        };
    } catch (e) {
        console.error('[projection] load error:', e);
        return { portal: null, allPortals: [], sceneConfigs: {}, error: String(e) };
    }
}
