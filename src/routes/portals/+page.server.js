export async function load({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return { portals: [], galaxies: [] };

    try {
        const { results: portals } = await db.prepare(`
            SELECT id, galaxy_id, name_es, name_en, name_fr,
                   description_es, description_en, description_fr,
                   icon, color_primary, color_bg, color_text,
                   video_url, status, active_writings_count
            FROM portals
            WHERE status = 'active'
            ORDER BY galaxy_id, discovered_at ASC
        `).all();

        const { results: galaxies } = await db.prepare(`
            SELECT id, name_es, name_en, name_fr, icon
            FROM galaxies ORDER BY sort_order ASC
        `).all();

        return { portals: portals || [], galaxies: galaxies || [] };
    } catch (e) {
        console.error('Portals load error:', e);
        return { portals: [], galaxies: [] };
    }
}
