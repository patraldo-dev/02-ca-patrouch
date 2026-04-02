// src/routes/api/profiles/+server.js
import { json } from '@sveltejs/kit';

const MAX_PROFILES = 5;

export async function GET({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { results } = await db.prepare(`
        SELECT id, display_name, locale, bio, is_primary, is_active
        FROM profiles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC
    `).bind(user.id).all();

    return json({ profiles: results || [] });
}

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { display_name, locale = 'en', bio = '' } = await request.json();

    if (!display_name || display_name.trim().length < 2) {
        return json({ error: 'Display name must be at least 2 characters' }, { status: 400 });
    }
    if (!['en', 'es', 'fr'].includes(locale)) {
        return json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Check count
    const { count } = (await db.prepare(`SELECT COUNT(*) as count FROM profiles WHERE user_id = ?`).bind(user.id).first()) || { count: 0 };
    if (count >= MAX_PROFILES) {
        return json({ error: `Maximum ${MAX_PROFILES} profiles allowed` }, { status: 429 });
    }

    // Deactivate any active profile
    await db.prepare(`UPDATE profiles SET is_active = 0 WHERE user_id = ?`).bind(user.id).run();

    const id = crypto.randomUUID();

    // If first profile, make it primary
    const is_primary = count === 0 ? 1 : 0;

    await db.prepare(`
        INSERT INTO profiles (id, user_id, display_name, locale, bio, is_primary, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(id, user.id, display_name.trim(), locale, bio.trim(), is_primary).run();

    return json({ profile: { id, display_name: display_name.trim(), locale, bio: bio.trim(), is_primary } }, { status: 201 });
}
