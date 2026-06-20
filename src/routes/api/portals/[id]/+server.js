import { json } from '@sveltejs/kit';

export async function GET({ params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    const { id } = params;

    try {
        const portal = await db.prepare(`
            SELECT 
                p.id, p.galaxy_id, p.icon, p.color_primary, p.color_bg, p.color_text,
                p.name_es, p.name_en, p.name_fr,
                p.description_es, p.description_en, p.description_fr,
                p.narrator_tone, p.narrator_vocabulary, p.narrator_proclamation_style,
                p.narrator_greeting, p.placement_mode, p.portal_distance, p.portal_y,
                p.triggers, p.status, p.active_writings_count
            FROM portals p
            WHERE p.id = ?
        `).bind(id).first();

        if (!portal) return json({ error: 'Portal not found' }, { status: 404 });

        try { portal.narrator_vocabulary = JSON.parse(portal.narrator_vocabulary || '[]'); } catch { portal.narrator_vocabulary = []; }
        try { portal.triggers = JSON.parse(portal.triggers || '[]'); } catch { portal.triggers = []; }

        return json(portal);
    } catch (e) {
        console.error('Portal fetch error:', e);
        return json({ error: 'Failed to fetch portal' }, { status: 500 });
    }
}
