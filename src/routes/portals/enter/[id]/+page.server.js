import { error, redirect } from '@sveltejs/kit';

export async function load({ params, platform, locals }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        throw error(503, 'Database unavailable');
    }

    const portalId = params.id;

    try {
        const portal = await db.prepare(`
            SELECT id, galaxy_id,
                   name_es, name_en, name_fr,
                   description_es, description_en, description_fr,
                   icon, color_primary, color_bg, color_text,
                   narrator_greeting, narrator_tone, narrator_vocabulary,
                   narrator_proclamation_style,
                   placement_mode, portal_distance, portal_y,
                   triggers, status, active_writings_count, video_url,
                   discovered_at,
                   owner_id, visibility, source_text
            FROM portals WHERE id = ?
        `).bind(portalId).first();

        if (!portal) {
            throw error(404, 'Portal not found');
        }

        // Visibility gate for personal (user-saved) realms.
        // Collective portals (owner_id IS NULL) are always open.
        if (portal.owner_id && portal.visibility === 'private') {
            const viewer = locals.user;
            if (!viewer) {
                throw redirect(302, `/login?redirect=${encodeURIComponent('/portals/enter/' + portalId)}`);
            }
            if (viewer.id !== portal.owner_id) {
                throw error(403, 'This realm is private');
            }
        }

        return { portalConfig: portal };
    } catch (e) {
        if (e?.status) throw e;
        if (e?.location) throw e; // redirect
        console.error('Portal enter error:', e);
        throw error(500, 'Failed to load portal');
    }
}
