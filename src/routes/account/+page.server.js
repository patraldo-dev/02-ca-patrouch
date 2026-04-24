import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');

    const db = locals.db;
    if (!db) return {
        user,
        profile: { bio: '', avatar_url: '', display_name: '', created_at: '', show_in_scoreboard: 1, show_email: 0 },
        notificationPrefs: { game: 1, writing: 1, community: 1 },
        isBQPlayer: false
    };

    // Load auth user data
    const baUser = await db.prepare(
        'SELECT name as display_name, image as avatar_url, createdAt as created_at, email FROM "user" WHERE id = ?'
    ).bind(user.id).first();

    // Load profile data including privacy columns
    let profileRow;
    try {
        profileRow = await db.prepare(
            'SELECT bio, COALESCE(show_in_scoreboard, 1) as show_in_scoreboard, COALESCE(show_email, 0) as show_email FROM profiles WHERE user_id = ? AND is_active = 1'
        ).bind(user.id).first();
    } catch (e) {
        // Columns may not exist yet
        profileRow = await db.prepare(
            'SELECT bio FROM profiles WHERE user_id = ? AND is_active = 1'
        ).bind(user.id).first();
    }

    const profile = {
        bio: profileRow?.bio || '',
        avatar_url: baUser?.avatar_url || '',
        display_name: baUser?.display_name || '',
        username: user.email || '',
        created_at: baUser?.created_at || user.createdAt || '',
        show_in_scoreboard: profileRow?.show_in_scoreboard ?? 1,
        show_email: profileRow?.show_email ?? 0,
        show_profile: 1
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
