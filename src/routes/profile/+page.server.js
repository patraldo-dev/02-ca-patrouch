// src/routes/profile/+page.server.js
import { redirect } from '@sveltejs/kit';
import { getWritingHeatmapData, getCurrentWriterOfTheWeek, getAllBadgesWithStatus } from '$lib/server/engagement.js';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return { profiles: [], writings: [], heatmapData: {}, writerOfTheWeek: null, userBadges: [], stats: null };

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

    const vis = await db.prepare('SELECT show_profile FROM users WHERE id = ?').bind(user.id).first();

    // Get engagement data for Stats & Badges tab
    let heatmapData = {};
    try { heatmapData = await getWritingHeatmapData(db, user.id); } catch (e) {}

    let writerOfTheWeek = null;
    try { writerOfTheWeek = await getCurrentWriterOfTheWeek(db); } catch (e) {}

    let userBadges = [];
    try { userBadges = await getAllBadgesWithStatus(db, user.id); } catch (e) {}

    let stats = null;
    try {
        const row = await db.prepare(`
            SELECT
                COUNT(*) as total_writings,
                COALESCE(SUM(word_count), 0) as total_words,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published
            FROM writings WHERE user_id = ?
        `).bind(user.id).first();
        stats = row || { total_writings: 0, total_words: 0, current_streak: 0, longest_streak: 0, published: 0 };

        // Calculate streaks from writings table directly
        const streakRows = await db.prepare(`
            SELECT DISTINCT DATE(created_at) as d
            FROM writings WHERE user_id = ? AND status = 'published'
            ORDER BY d DESC
        `).bind(user.id).all();
        const dates = (streakRows.results || []).map(r => r.d);
        let streak = 0, maxStreak = 0;
        for (const d of dates) {
            streak++;
            if (streak > maxStreak) maxStreak = streak;
        }
        stats.current_streak = streak;
        stats.longest_streak = maxStreak;
    } catch (e) { console.error('Stats error:', e); }

    return { profiles: results || [], writings: writings || [], showProfile: vis?.show_profile ?? 1, heatmapData, writerOfTheWeek, userBadges, stats };
}
