/**
 * GET /api/assets/library
 *
 * Query the GLB asset library. Used by the scene element system to find
 * real 3D models that match what Mistral generated from the user's writing.
 *
 * Query params:
 *   kind   — the scene element kind (quadruped, figure, plant, etc.)
 *   label  — optional label to match (dog, tree, building)
 *   pack   — optional pack filter (core, antoine)
 *   tier   — optional tier filter (free, premium). Default: free
 *
 * Returns: { models: [{ id, kind, label, file_path, scale, collider_type, collider_size, pack }] }
 *
 * No auth — the library catalog is public. Tier gating happens here:
 * anonymous/free users only get tier='free' models.
 */
import { json } from '@sveltejs/kit';

export async function GET({ url, platform, locals }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    const kind = url.searchParams.get('kind');
    const label = url.searchParams.get('label');
    const pack = url.searchParams.get('pack');
    // Premium tier only if the user has a member/admin role
    const includePremium = locals.user?.role === 'admin' || locals.user?.role === 'member';

    if (!kind) {
        return json({ error: 'kind parameter is required' }, { status: 400 });
    }

    try {
        let query = `SELECT id, kind, label, match_labels, file_path, pack, artist, tier, scale, collider_type, collider_size, game_name, game_behavior, game_points
                      FROM asset_library
                      WHERE kind = ? AND status = 'active'`;
        const binds = [kind];

        // Tier gate: free users only see free models
        if (!includePremium) {
            query += ` AND tier = 'free'`;
        }

        // Label matching: check both the primary label and the match_labels JSON array
        if (label) {
            query += ` AND (label = ? OR match_labels LIKE ?)`;
            binds.push(label, `%"${label}"%`);
        }

        if (pack) {
            query += ` AND pack = ?`;
            binds.push(pack);
        }

        query += ` ORDER BY RANDOM()`;

        const result = await db.prepare(query).bind(...binds).all();

        const models = (result.results || []).map((r) => ({
            ...r,
            match_labels: r.match_labels ? JSON.parse(r.match_labels) : [],
            collider_size: r.collider_size ? JSON.parse(r.collider_size) : null,
            url: `/api/assets/${r.file_path}`,
        }));

        return json({ models });
    } catch (e) {
        console.error('[assets/library] query error:', e.message);
        return json({ error: 'Failed to query library' }, { status: 500 });
    }
}
