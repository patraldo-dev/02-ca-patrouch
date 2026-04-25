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

    // Load auth user data — keep createdAt as-is (no alias)
    const baUser = await db.prepare(
        'SELECT name as display_name, image as avatar_url, createdAt, email FROM "user" WHERE id = ?'
    ).bind(user.id).first();
    console.log('[ACCOUNT] baUser:', JSON.stringify(baUser), 'createdAt type:', typeof baUser?.createdAt);

    // Load profile data including privacy columns
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

    // Format member_since on server
    let member_since = '';
    const rawDate = baUser?.createdAt;
    if (rawDate != null) {
        const ms = (typeof rawDate === 'number') ? rawDate * 1000 : new Date(rawDate).getTime();
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
            member_since = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }
    console.log('[ACCOUNT] member_since:', member_since, 'from rawDate:', rawDate);

    const profile = {
        bio: profileRow?.bio || '',
        avatar_url: baUser?.avatar_url || '',
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
