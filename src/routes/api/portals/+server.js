import { json } from '@sveltejs/kit';

export async function GET({ platform, url }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    const status = url.searchParams.get('status') || 'active';
    const lang = url.searchParams.get('lang') || 'es';

    try {
        // Fetch portals with their galaxy info
        const { results: portals } = await db.prepare(`
            SELECT 
                p.id, p.galaxy_id, p.icon, p.color_primary, p.color_bg, p.color_text,
                p.name_es, p.name_en, p.name_fr,
                p.description_es, p.description_en, p.description_fr,
                p.narrator_tone, p.narrator_vocabulary, p.narrator_proclamation_style,
                p.narrator_greeting, p.placement_mode, p.portal_distance, p.portal_y,
                p.triggers, p.status, p.active_writings_count,
                g.name_es as galaxy_name_es, g.name_en as galaxy_name_en, g.name_fr as galaxy_name_fr,
                g.icon as galaxy_icon, g.sort_order as galaxy_sort
            FROM portals p
            JOIN galaxies g ON p.galaxy_id = g.id
            WHERE p.status = ?
            ORDER BY g.sort_order ASC, p.discovered_at ASC
        `).bind(status).all();

        // Parse JSON fields
        for (const p of portals || []) {
            try { p.narrator_vocabulary = JSON.parse(p.narrator_vocabulary || '[]'); } catch { p.narrator_vocabulary = []; }
            try { p.triggers = JSON.parse(p.triggers || '[]'); } catch { p.triggers = []; }
        }

        // Group by galaxy
        const galaxies = {};
        for (const p of portals || []) {
            if (!galaxies[p.galaxy_id]) {
                galaxies[p.galaxy_id] = {
                    id: p.galaxy_id,
                    name_es: p.galaxy_name_es,
                    name_en: p.galaxy_name_en,
                    name_fr: p.galaxy_name_fr,
                    icon: p.galaxy_icon,
                    sort_order: p.galaxy_sort,
                    portals: []
                };
            }
            galaxies[p.galaxy_id].portals.push(p);
        }

        return json({
            galaxies: Object.values(galaxies),
            portals: portals || [],
            count: portals?.length || 0
        });
    } catch (e) {
        console.error('Portals API error:', e);
        return json({ error: 'Failed to fetch portals' }, { status: 500 });
    }
}
