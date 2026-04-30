import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return {
        user,
        profile: { bio: '', avatar_url: '', display_name: '', member_since: '', show_in_scoreboard: 1, show_email: 0 },
        notificationPrefs: { game: 1, writing: 1, community: 1 },
        isBQPlayer: false
    };

    // Load auth user data
    const baUser = await db.prepare(
        'SELECT name as display_name, image as avatar_url, createdAt, email FROM "user" WHERE id = ?'
    ).bind(user.id).first();

    // Load profile data
    let profileRow;
    try {
        profileRow = await db.prepare(
            'SELECT bio, COALESCE(show_in_scoreboard, 1) as show_in_scoreboard, COALESCE(show_email, 0) as show_email FROM profiles WHERE user_id = ? AND is_active = 1'
        ).bind(user.id).first();
    } catch (e) {
        profileRow = await db.prepare(
            'SELECT bio FROM profiles WHERE user_id = ? AND is_active = 1'
        ).bind(user.id).first();
    }

    // Get profile avatar (preferred) or social login image
    let profileAvatar = '';
    try {
        const pa = await db.prepare('SELECT avatar_url FROM profiles WHERE user_id = ? AND is_active = 1').bind(user.id).first();
        profileAvatar = pa?.avatar_url || '';
    } catch (e) {}

    // Format member_since — D1 returns epoch as string like "1776974583.0"
    let member_since = '';
    const rawDate = baUser?.createdAt ?? baUser?.created_at ?? user?.createdAt;
    if (rawDate != null) {
        const ms = parseFloat(rawDate) * 1000;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
            member_since = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    const profile = {
        bio: profileRow?.bio || '',
        avatar_url: profileAvatar || baUser?.avatar_url || '',
        display_name: baUser?.display_name || '',
        username: baUser?.email || user.email || '',
        member_since,
        show_in_scoreboard: profileRow?.show_in_scoreboard ?? 1,
        show_email: profileRow?.show_email ?? 0,
    };

    // Load notification preferences
    let notificationPrefs;
    try {
        notificationPrefs = await db.prepare(
            'SELECT game, writing, community FROM notification_preferences WHERE user_id = ?'
        ).bind(user.id).first();
    } catch (e) {
        notificationPrefs = null;
    }
    if (!notificationPrefs) {
        notificationPrefs = { game: 1, writing: 1, community: 1 };
    }

    // Check if user is a Bottle Quest player
    let isBQPlayer = false;
    try {
        const bq = await db.prepare('SELECT 1 as ok FROM bq_players WHERE user_id = ?').bind(user.id).first();
        isBQPlayer = !!bq;
    } catch (e) {}

    return { user, profile, notificationPrefs, isBQPlayer };
}
