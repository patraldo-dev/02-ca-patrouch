// src/routes/api/profiles/[id]/+server.js
import { json } from '@sveltejs/kit';

export async function PATCH({ request, params, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { id } = params;
    const { display_name, locale, bio } = await request.json();

    // Verify ownership
    const profile = await db.prepare(`SELECT * FROM profiles WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
    if (!profile) return json({ error: 'Profile not found' }, { status: 404 });

    const updates = [];
    const values = [];

    if (display_name !== undefined) {
        if (display_name.trim().length < 2) return json({ error: 'Name too short' }, { status: 400 });
        updates.push('display_name = ?');
        values.push(display_name.trim());
    }
    if (locale !== undefined) {
        if (!['en', 'es', 'fr'].includes(locale)) return json({ error: 'Invalid locale' }, { status: 400 });
        updates.push('locale = ?');
        values.push(locale);
    }
    if (bio !== undefined) {
        updates.push('bio = ?');
        values.push(bio.trim());
    }

    if (updates.length === 0) return json({ error: 'Nothing to update' }, { status: 400 });

    values.push(id);
    await db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return json({ ok: true });
}

export async function DELETE({ params, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { id } = params;

    const profile = await db.prepare(`SELECT * FROM profiles WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
    if (!profile) return json({ error: 'Profile not found' }, { status: 404 });
    if (profile.is_primary) return json({ error: 'Cannot delete primary profile' }, { status: 403 });

    await db.prepare(`DELETE FROM profiles WHERE id = ?`).bind(id).run();

    // If deleted was active, activate primary
    if (profile.is_active) {
        await db.prepare(`UPDATE profiles SET is_active = 1 WHERE user_id = ? AND is_primary = 1`).bind(user.id).run();
    }

    return json({ ok: true });
}
