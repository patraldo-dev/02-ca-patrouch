/**
 * PUT  /api/realms/[id]  — toggle visibility (private ↔ public)
 * DELETE /api/realms/[id] — delete a saved realm
 *
 * Both are owner-scoped: WHERE id = ? AND owner_id = ?.
 * Mirrors the writings privacy pattern.
 *
 * Auth required (Pattern A — locals.user).
 */
import { json } from '@sveltejs/kit';

export async function PUT({ params, request, locals, platform }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    let body;
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const realmId = params.id;

    try {
        const result = await db.prepare(`
            UPDATE portals SET visibility = ?, discovered_at = discovered_at
            WHERE id = ? AND owner_id = ?
        `).bind(visibility, realmId, user.id).run();

        if (!result.meta.changes) {
            return json({ error: 'Realm not found or not owned by you' }, { status: 404 });
        }

        return json({ success: true, visibility, url: `/portals/enter/${realmId}` });
    } catch (e) {
        console.error('[realms/put] DB error:', e.message);
        return json({ error: 'Failed to update realm' }, { status: 500 });
    }
}

export async function DELETE({ params, locals, platform }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    const realmId = params.id;

    try {
        // Delete scene config first (portal_scenes has no FK cascade)
        await db.prepare('DELETE FROM portal_scenes WHERE portal_id = ?').bind(realmId).run();

        // Then delete the portal itself (owner-scoped)
        const result = await db.prepare(
            'DELETE FROM portals WHERE id = ? AND owner_id = ?'
        ).bind(realmId, user.id).run();

        if (!result.meta.changes) {
            return json({ error: 'Realm not found or not owned by you' }, { status: 404 });
        }

        return json({ success: true });
    } catch (e) {
        console.error('[realms/delete] DB error:', e.message);
        return json({ error: 'Failed to delete realm' }, { status: 500 });
    }
}
