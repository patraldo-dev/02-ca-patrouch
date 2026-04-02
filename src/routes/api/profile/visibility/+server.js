// src/routes/api/profile/visibility/+server.js
import { json } from '@sveltejs/kit';

export async function PUT({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { show_profile } = await request.json();
    if (typeof show_profile !== 'number') {
        return json({ error: 'Invalid value' }, { status: 400 });
    }

    await db.prepare(
        "UPDATE users SET show_profile = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(show_profile, user.id).run();

    return json({ success: true, show_profile });
}

export async function GET({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const row = await db.prepare(
        'SELECT show_profile FROM users WHERE id = ?'
    ).bind(user.id).first();

    return json({ show_profile: row?.show_profile ?? 1 });
}
