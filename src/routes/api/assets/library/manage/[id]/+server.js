/**
 * DELETE /api/assets/library/manage/[id] — soft-retire a model
 * PUT    /api/assets/library/manage/[id] — update a model
 *
 * Admin-only.
 */
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role.js';

export async function DELETE({ params, locals, platform, url }) {
    try {
        await requireRole(locals, ['admin'], url);
    } catch (e) {
        if (e?.status === 303) return json({ error: 'Unauthorized' }, { status: 401 });
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        // Soft delete: set status to 'retired' so existing references don't break
        const result = await db.prepare(
            "UPDATE asset_library SET status = 'retired', updated_at = datetime('now') WHERE id = ?"
        ).bind(params.id).run();

        if (!result.meta.changes) {
            return json({ error: 'Model not found' }, { status: 404 });
        }
        return json({ success: true });
    } catch (e) {
        return json({ error: 'Failed to retire model' }, { status: 500 });
    }
}

export async function PUT({ params, request, locals, platform, url }) {
    try {
        await requireRole(locals, ['admin'], url);
    } catch (e) {
        if (e?.status === 303) return json({ error: 'Unauthorized' }, { status: 401 });
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

    const allowed = ['kind', 'label', 'match_labels', 'file_path', 'pack', 'artist', 'tier', 'scale', 'collider_type', 'collider_size', 'description', 'tags', 'status'];
    const sets = [];
    const values = [];

    for (const key of allowed) {
        if (key in body) {
            sets.push(`${key} = ?`);
            let val = body[key];
            if (key === 'match_labels' || key === 'collider_size' || key === 'tags') {
                val = val ? JSON.stringify(val) : null;
            }
            values.push(val);
        }
    }

    if (!sets.length) return json({ error: 'No fields to update' }, { status: 400 });

    sets.push("updated_at = datetime('now')");
    values.push(params.id);

    try {
        const result = await db.prepare(
            `UPDATE asset_library SET ${sets.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        if (!result.meta.changes) {
            return json({ error: 'Model not found' }, { status: 404 });
        }
        return json({ success: true });
    } catch (e) {
        return json({ error: 'Failed to update model' }, { status: 500 });
    }
}
