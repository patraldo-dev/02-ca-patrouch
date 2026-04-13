import { json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = locals.db;
    const commentId = params.id;
    const userId = locals.user.id;

    // Check comment exists and is approved
    const comment = await db.prepare(
        'SELECT id, writing_id FROM comments WHERE id = ? AND status = ?'
    ).bind(commentId, 'approved').first();

    if (!comment) return json({ error: 'Not found' }, { status: 404 });

    // Check if already liked
    const existing = await db.prepare(
        'SELECT user_id FROM comment_likes WHERE user_id = ? AND comment_id = ?'
    ).bind(userId, commentId).first();

    if (existing) {
        // Unlike
        await db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').bind(userId, commentId).run();
        await db.prepare('UPDATE comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').bind(commentId).run();
        return json({ liked: false });
    } else {
        // Like
        await db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)').bind(userId, commentId).run();
        await db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').bind(commentId).run();
        return json({ liked: true });
    }
}
