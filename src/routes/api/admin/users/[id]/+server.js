// src/routes/api/admin/users/[id]/+server.js
import { json } from '@sveltejs/kit';

export async function DELETE({ locals, params }) {
    const user = locals.user;
    if (!user || user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const targetId = params.id;

    // Prevent deleting yourself
    if (targetId === user.id) {
        return json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Prevent deleting other admins (optional safety)
    const target = await db.prepare('SELECT role FROM users WHERE id = ?').bind(targetId).first();
    if (!target) return json({ error: 'User not found' }, { status: 404 });
    if (target.role === 'admin') {
        return json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Delete user's profiles, writings, and prompt logs first
    await db.prepare('DELETE FROM profiles WHERE user_id = ?').bind(targetId).run();
    await db.prepare('DELETE FROM writings WHERE user_id = ?').bind(targetId).run();
    await db.prepare('DELETE FROM daily_prompt_log WHERE user_id = ?').bind(targetId).run();
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId).run();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

    return json({ success: true });
}
