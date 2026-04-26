// src/routes/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals, cookies }) {
    const serverLocale = cookies.get('preferredLanguage') || null;

    // Auto-create primary profile for existing users who don't have one
    const db = locals?.db;
    const user = locals?.user;
    let activeProfile = null;

    if (db && user) {
        const { count } = (await db.prepare(`SELECT COUNT(*) as count FROM profiles WHERE user_id = ?`).bind(user.id).first()) || { count: 0 };

        if (count === 0) {
            // Create primary profile from user data
            const id = crypto.randomUUID();
            await db.prepare(`
                INSERT INTO profiles (id, user_id, display_name, locale, bio, is_primary, is_active)
                VALUES (?, ?, ?, ?, '', 1, 1)
            `).bind(id, user.id, user.username, serverLocale || 'en').run();
        }

        // Get active profile
        activeProfile = await db.prepare(`
            SELECT id, display_name, locale, bio, is_primary, is_active
            FROM profiles WHERE user_id = ? AND is_active = 1
        `).bind(user.id).first();

        // Get booty player data (beans)
        var bootyPlayer = await db.prepare(
            'SELECT fuel FROM bq_players WHERE user_id = ?'
        ).bind(user.id).first().catch(() => null);

        // Get avatar from profile (takes priority over social login image)
        var profileAvatar = await db.prepare(
            'SELECT avatar_url FROM profiles WHERE user_id = ? AND is_active = 1'
        ).bind(user.id).first().catch(() => null);

        // Fallback to primary if no active
        if (!activeProfile) {
            const primary = await db.prepare(`
                SELECT id, display_name, locale, bio, is_primary, is_active
                FROM profiles WHERE user_id = ? AND is_primary = 1
            `).bind(user.id).first();
            if (primary) {
                await db.prepare(`UPDATE profiles SET is_active = 1 WHERE id = ?`).bind(primary.id).run();
                activeProfile = primary;
            }
        }
    }

    let onboarding_completed = true;
    if (user) {
        const ob = await locals.db.prepare(
            'SELECT onboarding_completed FROM user WHERE id = ?'
        ).bind(user.id).first().catch(() => ({ onboarding_completed: 1 }));
        onboarding_completed = ob?.onboarding_completed === 1;
    }

    return {
        user: user || null,
        serverLocale,
        activeProfile,
        onboarding_completed,
        bootyFuel: bootyPlayer?.fuel || 0,
        avatarUrl: profileAvatar?.avatar_url || null
    };
}
