// src/lib/server/notify.js — Helper to send notifications
// Can be imported by any server endpoint or cron

export async function notify(db, { user_id, type, title, body, meta }) {
    if (!db || !user_id || !title) return;
    try {
        await db.prepare(
            'INSERT INTO notifications (user_id, type, title, body, meta) VALUES (?, ?, ?, ?, ?)'
        ).bind(user_id, type, title, body, meta ? JSON.stringify(meta) : null).run();
    } catch (e) {
        console.error('[notify] Failed:', e.message);
    }
}

// Notify all players (used by narrator, global events)
export async function notifyAll(db, { type, title, body, meta }) {
    if (!db) return;
    try {
        const { results } = await db.prepare(
            'SELECT id FROM "user" WHERE id IN (SELECT DISTINCT user_id FROM notification_preferences WHERE game = 1)'
        ).all();
        for (const u of (results || [])) {
            await notify(db, { user_id: u.id, type, title, body, meta });
        }
    } catch (e) {
        console.error('[notifyAll] Failed:', e.message);
    }
}
