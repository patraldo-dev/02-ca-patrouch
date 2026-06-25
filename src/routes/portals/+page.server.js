export async function load({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return { galaxies: [], portals: [], count: 0, featuredPortal: null, _debug: 'NO_DB_BINDING' };

    try {
        const { results: portals, success, error } = await db.prepare(`
            SELECT 
                p.id, p.galaxy_id, p.icon, p.color_primary, p.color_bg, p.color_text,
                p.name_es, p.name_en, p.name_fr,
                p.description_es, p.description_en, p.description_fr,
                p.status, p.active_writings_count, p.video_url,
                p.narrator_greeting, p.narrator_tone,
                g.name_es as galaxy_name_es, g.name_en as galaxy_name_en, g.name_fr as galaxy_name_fr,
                g.icon as galaxy_icon, g.sort_order as galaxy_sort
            FROM portals p
            JOIN galaxies g ON p.galaxy_id = g.id
            WHERE p.status = 'active'
            ORDER BY g.sort_order ASC, p.discovered_at ASC
        `).all();

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
            _debug: `OK: ${portals?.length || 0} portals, success=${success}`
        };
    } catch (e) {
        console.error('Portals load error:', e);
        return { galaxies: [], portals: [], count: 0, featuredPortal: null, _debug: 'ERROR: ' + e.message };
    }
}
