// src/routes/profile/+page.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return { profiles: [] };

    const { results } = await db.prepare(`
        SELECT id, display_name, locale, bio, is_primary, is_active
        FROM profiles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC
    `).bind(user.id).all();

    return { profiles: results || [] };
}
