import { json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (locals.user.role !== 'admin') return json({ error: 'Admin only' }, { status: 403 });

    const db = locals.db;
    const commentId = params.id;

    const comment = await db.prepare(
        'SELECT id, is_featured FROM comments WHERE id = ?'
    ).bind(commentId).first();

    if (!comment) return json({ error: 'Not found' }, { status: 404 });

    const newPick = comment.is_featured ? 0 : 1;
    await db.prepare(
        'UPDATE comments SET is_featured = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(newPick, commentId).run();

    return json({ is_featured: newPick });
}
