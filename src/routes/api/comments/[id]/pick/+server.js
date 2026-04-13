import { json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (locals.user.role !== 'admin') return json({ error: 'Admin only' }, { status: 403 });

    const db = locals.db;
    const commentId = params.id;

    const comment = await db.prepare(
        'SELECT id, is_nyt_pick FROM comments WHERE id = ?'
    ).bind(commentId).first();

    if (!comment) return json({ error: 'Not found' }, { status: 404 });

    const newPick = comment.is_nyt_pick ? 0 : 1;
    await db.prepare(
        'UPDATE comments SET is_nyt_pick = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(newPick, commentId).run();

    return json({ is_nyt_pick: newPick });
}
