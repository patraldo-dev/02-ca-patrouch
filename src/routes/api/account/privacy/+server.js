// src/routes/api/account/privacy/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 500 });

    const { show_profile, show_in_scoreboard, show_email } = await request.json();

    // Update show_profile in users table
    if (show_profile !== undefined) {
        await db.prepare('UPDATE users SET show_profile = ? WHERE id = ?')
            .bind(show_profile, user.id).run();
    }

    // Update privacy columns in profiles table
    if (show_in_scoreboard !== undefined || show_email !== undefined) {
        try {
            await db.prepare(`
                UPDATE profiles SET
                    show_in_scoreboard = COALESCE(?, show_in_scoreboard),
                    show_email = COALESCE(?, show_email)
                WHERE user_id = ? AND is_active = 1
            `).bind(show_in_scoreboard ?? null, show_email ?? null, user.id).run();
        } catch (e) {
            // Columns may not exist — try adding them
            try { await db.prepare('ALTER TABLE profiles ADD COLUMN show_in_scoreboard INTEGER NOT NULL DEFAULT 1').run(); } catch {}
            try { await db.prepare('ALTER TABLE profiles ADD COLUMN show_email INTEGER NOT NULL DEFAULT 0').run(); } catch {}
            await db.prepare(`
                UPDATE profiles SET
                    show_in_scoreboard = COALESCE(?, show_in_scoreboard),
                    show_email = COALESCE(?, show_email)
                WHERE user_id = ? AND is_active = 1
            `).bind(show_in_scoreboard ?? null, show_email ?? null, user.id).run();
        }
    }

    return json({ ok: true });
}
