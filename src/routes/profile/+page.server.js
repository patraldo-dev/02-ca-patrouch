// src/routes/profile/+page.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return { profiles: [], writings: [] };

    const { results } = await db.prepare(`
        SELECT id, display_name, locale, bio, is_primary, is_active
        FROM profiles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC
    `).bind(user.id).all();

    // Get top 10 published writings across all user's accounts
    const { results: writings } = await db.prepare(`
        SELECT w.id, w.title, w.word_count, w.locale, w.status, w.created_at, w.category
        FROM writings w
        WHERE w.user_id = ? AND w.status = 'published' AND w.visibility = 'public'
        ORDER BY w.created_at DESC
        LIMIT 10
    `).bind(user.id).all();

    return { profiles: results || [], writings: writings || [] };
}
