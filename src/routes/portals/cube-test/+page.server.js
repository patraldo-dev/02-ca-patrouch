import { error } from '@sveltejs/kit';

export async function load({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        throw error(503, 'Database unavailable');
    }

    const { results: galaxies } = await db.prepare(`
        SELECT id, name_es, name_en, name_fr, icon
        FROM galaxies ORDER BY id
    `).all();

    const { results: portals } = await db.prepare(`
        SELECT id, galaxy_id, name_es, name_en, name_fr,
               description_es, description_en, description_fr,
               icon, color_primary, color_bg, color_text,
               video_url, status, active_writings_count
        FROM portals WHERE status != 'dormant' OR active_writings_count > 0
        ORDER BY galaxy_id, sort_order
    `).all();

    return { portals, galaxies };
}
