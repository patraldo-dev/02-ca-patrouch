import { error } from '@sveltejs/kit';

export async function load({ params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        throw error(503, 'Database unavailable');
    }

    const portalId = params.id;

    // Fetch portal config
    const portal = await db.prepare(`
        SELECT id, galaxy_id, name_es, name_en, name_fr,
               description_es, description_en, description_fr,
               icon, color_primary, color_bg, color_text,
               narrator_greeting, narrator_personality, video_url,
               status, active_writings_count, triggers
        FROM portals WHERE id = ?
    `).bind(portalId).first();

    if (!portal) {
        throw error(404, 'Portal not found');
    }

    return { portalConfig: portal };
}
