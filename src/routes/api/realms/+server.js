/**
 * GET /api/realms
 *
 * List the current user's saved realms. Returns metadata only
 * (not full scene configs) — the client fetches scene data on enter.
 *
 * Auth required (Pattern A — locals.user).
 *
 * Response: { realms: [{ id, name, source_text, excerpt, visibility,
 *             created_at, environment_type, color_primary }] }
 */
import { json } from '@sveltejs/kit';

export async function GET({ locals, platform }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        const result = await db.prepare(`
            SELECT id, name_es, source_text, visibility, color_primary, discovered_at
            FROM portals
            WHERE owner_id = ? AND galaxy_id = 'personal'
            ORDER BY discovered_at DESC
        `).bind(user.id).all();

        const realms = (result.results || []).map((r) => {
            // Extract environment from the latest scene config
            const excerpt = (r.source_text || '').replace(/\s+/g, ' ').trim().slice(0, 100);
            return {
                id: r.id,
                name: r.name_es || 'Untitled realm',
                excerpt: excerpt.length < (r.source_text || '').length ? excerpt + '…' : excerpt,
                visibility: r.visibility || 'private',
                color_primary: r.color_primary || '#c9a87c',
                created_at: r.discovered_at,
            };
        });

        return json({ realms });
    } catch (e) {
        console.error('[realms/list] DB error:', e.message);
        return json({ error: 'Failed to list realms' }, { status: 500 });
    }
}
