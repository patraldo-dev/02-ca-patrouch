import { json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = locals.db;
    const commentId = params.id;

    const comment = await db.prepare(
        'SELECT id FROM comments WHERE id = ?'
    ).bind(commentId).first();

    if (!comment) return json({ error: 'Not found' }, { status: 404 });

    // Simple report: just mark as flagged (we could add a reports table later)
    // For now, update status to trigger review
    await db.prepare(
        "UPDATE comments SET status = CASE WHEN status = 'approved' THEN 'pending' ELSE status END, updated_at = datetime('now') WHERE id = ?"
    ).bind(commentId).run();

    return json({ success: true });
}
