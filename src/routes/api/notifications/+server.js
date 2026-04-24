import { json } from '@sveltejs/kit';

export async function GET({ locals, url, platform }) {
    if (!locals.user) return json({ notifications: [], unreadCount: 0 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ notifications: [], unreadCount: 0 });

    try {
        const userId = locals.user.id;
        const unreadOnly = url.searchParams.get('unread') === 'true';

        if (unreadOnly) {
            const { results } = await db.prepare(`
                SELECT * FROM notifications WHERE user_id = ? AND read = 0
                ORDER BY created_at DESC LIMIT 50
            `).bind(userId).all();
            return json({ notifications: results || [], unreadCount: results?.length || 0 });
        }

        const { results } = await db.prepare(`
            SELECT * FROM notifications WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 50
        `).bind(userId).all();

        const countRow = await db.prepare(`
            SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0
        `).bind(userId).first();

        return json({ notifications: results || [], unreadCount: countRow?.c || 0 });
    } catch (e) {
        return json({ notifications: [], unreadCount: 0 }, { status: 500 });
    }
}
