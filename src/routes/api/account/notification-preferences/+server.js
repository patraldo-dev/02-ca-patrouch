// src/routes/api/account/notification-preferences/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 500 });

    const { game, writing, community } = await request.json();

    await db.prepare(`
        INSERT INTO notification_preferences (user_id, game, writing, community, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            game = excluded.game,
            writing = excluded.writing,
            community = excluded.community,
            updated_at = datetime('now')
    `).bind(user.id, game ?? 1, writing ?? 1, community ?? 1).run();

    return json({ ok: true });
}
