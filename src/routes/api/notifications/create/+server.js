import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const auth = request.headers.get('Authorization');
    if (!auth || !cronSecret || auth !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { user_id, type = 'narrator', title, body: bodyText, meta } = await request.json();

        if (!user_id || !title || !bodyText) {
            return json({ error: 'Missing required fields: user_id, title, body' }, { status: 400 });
        }

        await db.prepare(`
            INSERT INTO notifications (user_id, type, title, body, meta) VALUES (?, ?, ?, ?, ?)
        `).bind(user_id, type, title, bodyText, meta ? JSON.stringify(meta) : null).run();

        return json({ success: true });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
