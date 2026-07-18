export async function load({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return { models: [] };

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

        return { models };
    } catch (e) {
        console.error('[admin/assets] load error:', e.message);
        return { models: [] };
    }
}
