import { json } from '@sveltejs/kit';

export async function POST({ locals, request, platform }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    try {
        const userId = locals.user.id;
        const body = await request.json();

        if (body.all) {
            await db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`).bind(userId).run();
        } else if (Array.isArray(body.ids) && body.ids.length > 0) {
            const placeholders = body.ids.map(() => '?').join(',');
            await db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`).bind(userId, ...body.ids).run();
        }

        return json({ success: true });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
