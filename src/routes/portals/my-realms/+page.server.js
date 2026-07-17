import { redirect } from '@sveltejs/kit';

export async function load({ locals, platform }) {
    if (!locals.user) {
        throw redirect(302, `/login?redirect=${encodeURIComponent('/portals/my-realms')}`);
    }

    const db = platform?.env?.DB_book;
    if (!db) return { realms: [], user: locals.user };

    try {
        const result = await db.prepare(`
            SELECT id, name_es, source_text, visibility, color_primary, discovered_at
            FROM portals
            WHERE owner_id = ? AND galaxy_id = 'personal'
            ORDER BY discovered_at DESC
        `).bind(locals.user.id).all();

        return { realms: result.results || [], user: locals.user };
    } catch (e) {
        console.error('[my-realms] DB error:', e.message);
        return { realms: [], user: locals.user };
    }
}
