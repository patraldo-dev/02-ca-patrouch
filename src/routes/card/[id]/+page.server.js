import { error } from '@sveltejs/kit';

export async function load({ params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) throw error(503, 'Database unavailable');

    const writingId = params.id;
    if (!writingId) throw error(400, 'Writing ID required');

    const writing = await db.prepare(`
        SELECT w.id, w.title, w.content, w.word_count, w.created_at, w.ai_assisted,
            u.username, u.id as user_id
        FROM writings w
        JOIN users u ON w.user_id = u.id
        WHERE w.id = ? AND w.visibility = 'public'
    `).bind(writingId).first();

    if (!writing) throw error(404, 'Writing not found');

    const excerpt = writing.content.length > 280
        ? writing.content.slice(0, 280).trim() + '…'
        : writing.content;

    return {
        writing: {
            id: writing.id,
            title: writing.title,
            excerpt,
            wordCount: writing.word_count,
            author: writing.username,
            createdAt: writing.created_at,
            aiAssisted: !!writing.ai_assisted
        }
    };
}
