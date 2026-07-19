/**
 * Admin management endpoints for the asset library.
 *   POST   /api/assets/library/manage     — add a new model
 *   PUT    /api/assets/library/manage/[id] — update a model
 *   DELETE /api/assets/library/manage/[id] — delete (soft-retire) a model
 *
 * Admin-only (requireRole). The GET for listing is handled by the
 * library endpoint without auth; these mutations require admin.
 */
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role.js';

export async function POST({ request, locals, platform, url }) {
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

    const {
        id, kind, label, match_labels, file_path,
        pack = 'core', artist, tier = 'free',
        scale = 1.0, collider_type = 'box', collider_size,
        description, tags,
        game_name = null, game_behavior = 'passive', game_points = 1
    } = body;

    if (!id || !kind || !label || !file_path) {
        return json({ error: 'id, kind, label, and file_path are required' }, { status: 400 });
    }

    try {
        await db.prepare(`
            INSERT INTO asset_library (id, kind, label, match_labels, file_path, pack, artist, tier, scale, collider_type, collider_size, description, tags, game_name, game_behavior, game_points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                kind=excluded.kind, label=excluded.label, match_labels=excluded.match_labels,
                file_path=excluded.file_path, pack=excluded.pack, artist=excluded.artist,
                tier=excluded.tier, scale=excluded.scale, collider_type=excluded.collider_type,
                collider_size=excluded.collider_size, description=excluded.description,
                tags=excluded.tags, game_name=excluded.game_name, game_behavior=excluded.game_behavior,
                game_points=excluded.game_points, updated_at=datetime('now')
        `).bind(
            id, kind, label,
            match_labels ? JSON.stringify(match_labels) : null,
            file_path, pack, artist, tier, scale,
            collider_type,
            collider_size ? JSON.stringify(collider_size) : null,
            description || null,
            tags ? JSON.stringify(tags) : null,
            game_name,
            game_behavior,
            parseInt(game_points) || 1
        ).run();

        return json({ success: true, id });
    } catch (e) {
        console.error('[assets/manage] insert error:', e.message);
        return json({ error: 'Failed to add model: ' + e.message }, { status: 500 });
    }
}

export async function GET({ locals, platform, url }) {
    // Admin list: returns ALL models (including retired), with full metadata
    try {
        await requireRole(locals, ['admin'], url);
    } catch (e) {
        if (e?.status === 303) return json({ error: 'Unauthorized' }, { status: 401 });
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        const result = await db.prepare(`
            SELECT * FROM asset_library ORDER BY kind, label, created_at DESC
        `).all();

        const models = (result.results || []).map((r) => ({
            ...r,
            match_labels: r.match_labels ? JSON.parse(r.match_labels) : [],
            collider_size: r.collider_size ? JSON.parse(r.collider_size) : null,
            tags: r.tags ? JSON.parse(r.tags) : [],
        }));

        return json({ models });
    } catch (e) {
        return json({ error: 'Failed to list models' }, { status: 500 });
    }
}
