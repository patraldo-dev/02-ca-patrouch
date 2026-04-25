import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return { user, writings: [], totalWords: 0, streak: 0, badges: [] };

    const writings = await db.prepare(
        'SELECT id, title, created_at, word_count, locale, status FROM writings WHERE user_id = ? ORDER BY created_at DESC LIMIT 365'
    ).bind(user.id).all();

    const totalWords = await db.prepare(
        'SELECT COALESCE(SUM(word_count), 0) as total FROM writings WHERE user_id = ?'
    ).bind(user.id).first();

    const badges = await db.prepare(
        'SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).bind(user.id).all();

    return { user, writings: writings.results || [], totalWords: totalWords?.total || 0, badges: badges.results || [] };
}
