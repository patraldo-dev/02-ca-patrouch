// src/lib/server/engagement.js
// Badge unlocking, milestone tracking, writer of the week, heatmap data

// ── Badge Definitions ──
export const BADGE_THRESHOLDS = {
    streak: [
        { value: 7, badgeId: 'badge_002' },
        { value: 30, badgeId: 'badge_003' },
        { value: 100, badgeId: 'badge_004' }
    ],
    total_words: [
        { value: 1000, badgeId: 'badge_005' },
        { value: 10000, badgeId: 'badge_006' },
        { value: 50000, badgeId: 'badge_007' },
        { value: 100000, badgeId: 'badge_008' }
    ],
    writings_count: [
        { value: 1, badgeId: 'badge_001' },
        { value: 10, badgeId: 'badge_013' },
        { value: 50, badgeId: 'badge_014' }
    ]
};

/**
 * Check and unlock badges for a user after a writing action
 */
export async function checkAndUnlockBadges(db, userId, stats) {
    const unlocked = [];

    // Check streak badges
    if (stats?.current_streak) {
        for (const threshold of BADGE_THRESHOLDS.streak) {
            if (stats.current_streak >= threshold.value) {
                const got = await tryUnlockBadge(db, userId, threshold.badgeId, `streak:${stats.current_streak}`);
                if (got) unlocked.push(got);
            }
        }
    }

    // Check word count badges
    if (stats?.total_words) {
        for (const threshold of BADGE_THRESHOLDS.total_words) {
            if (stats.total_words >= threshold.value) {
                const got = await tryUnlockBadge(db, userId, threshold.badgeId, `words:${stats.total_words}`);
                if (got) unlocked.push(got);
            }
        }
    }

    // Check writings count badges
    if (stats?.total_writings) {
        for (const threshold of BADGE_THRESHOLDS.writings_count) {
            if (stats.total_writings >= threshold.value) {
                const got = await tryUnlockBadge(db, userId, threshold.badgeId, `writings:${stats.total_writings}`);
                if (got) unlocked.push(got);
            }
        }
    }

    return unlocked;
}

/**
 * Try to unlock a badge for a user (idempotent)
 */
export async function tryUnlockBadge(db, userId, badgeId, context) {
    try {
        await db.prepare(`
            INSERT OR IGNORE INTO user_badges (id, user_id, badge_id, context)
            VALUES (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), ?, ?, ?)
        `).bind(userId, badgeId, context).run();

        const { results } = await db.prepare(`
            SELECT changes() as changed
        `).all();

        // Check if it was actually inserted (changes() > 0 means it was new)
        const badge = await db.prepare(`
            SELECT b.id, b.slug, b.name, b.description, b.icon, b.category, b.rarity
            FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ? AND ub.badge_id = ?
        `).bind(userId, badgeId).first();

        return badge;
    } catch (e) {
        console.error('Badge unlock error:', e);
        return null;
    }
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(db, userId) {
    const { results } = await db.prepare(`
        SELECT b.id, b.slug, b.name, b.description, b.icon, b.category, b.rarity, ub.unlocked_at, ub.context
        FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = ?
        ORDER BY ub.unlocked_at DESC
    `).bind(userId).all();

    return results || [];
}

/**
 * Get all available badges with unlock status for a user
 */
export async function getAllBadgesWithStatus(db, userId) {
    const { results: allBadges } = await db.prepare(`
        SELECT id, slug, name, description, icon, category, rarity, criteria
        FROM badges
        ORDER BY category, rarity
    `).all();

    const { results: userBadges } = await db.prepare(`
        SELECT badge_id, unlocked_at
        FROM user_badges
        WHERE user_id = ?
    `).bind(userId).all();

    const unlockedMap = {};
    (userBadges || []).forEach(ub => { unlockedMap[ub.badge_id] = ub.unlocked_at; });

    return (allBadges || []).map(b => ({
        ...b,
        unlocked: !!unlockedMap[b.id],
        unlockedAt: unlockedMap[b.id] || null
    }));
}

// ── Writing Heatmap ──

/**
 * Get daily writing activity for the past year (heatmap data)
 */
export async function getWritingHeatmapData(db, userId) {
    const { results } = await db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(word_count) as words
        FROM writings
        WHERE user_id = ?
        AND created_at >= datetime('now', '-365 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `).bind(userId).all();

    const data = {};
    (results || []).forEach(row => {
        data[row.date] = { count: row.count, words: row.words || 0 };
    });

    return data;
}

// ── Writer of the Week ──

/**
 * Calculate and set Writer of the Week
 * Should be run weekly (e.g., via cron or manually)
 */
export async function selectWriterOfTheWeek(db) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Check if already set for this week
    const existing = await db.prepare(`
        SELECT id FROM writer_of_the_week WHERE week_start = ?
    `).bind(weekStartStr).first();

    if (existing) return existing;

    // Find the most active writer this week
    const { results } = await db.prepare(`
        SELECT
            w.user_id,
            u.username,
            COUNT(*) as writings_count,
            COALESCE(SUM(w.word_count), 0) as words_written,
            MAX(w.id) as latest_writing_id
        FROM writings w
        JOIN users u ON w.user_id = u.id
        WHERE w.visibility = 'public'
        AND DATE(w.created_at) >= ?
        AND DATE(w.created_at) <= ?
        GROUP BY w.user_id
        ORDER BY words_written DESC, writings_count DESC
        LIMIT 1
    `).bind(weekStartStr, weekEndStr).all();

    if (!results || results.length === 0) return null;

    const winner = results[0];
    const id = `wotw_${weekStartStr}`;

    await db.prepare(`
        INSERT INTO writer_of_the_week (id, user_id, week_start, week_end, featured_writing_id, reason, words_written, writings_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        winner.user_id,
        weekStartStr,
        weekEndStr,
        winner.latest_writing_id,
        `Most active writer: ${winner.words_written} words across ${winner.writings_count} writings`,
        winner.words_written,
        winner.writings_count
    ).run();

    // Award badge
    await tryUnlockBadge(db, winner.user_id, 'badge_016', `week:${weekStartStr}`);

    return {
        id,
        userId: winner.user_id,
        username: winner.username,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        wordsWritten: winner.words_written,
        writingsCount: winner.writings_count
    };
}

/**
 * Get current Writer of the Week
 */
export async function getCurrentWriterOfTheWeek(db) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const result = await db.prepare(`
        SELECT wotw.*, u.username, u.id as user_uuid
        FROM writer_of_the_week wotw
        JOIN users u ON wotw.user_id = u.id
        WHERE wotw.week_start = ?
    `).bind(weekStartStr).first();

    return result || null;
}

// ── Agora Game Leaderboard ──

/**
 * Get leaderboard for current active Agora game round
 */
export async function getAgoraLeaderboard(db, roundId) {
    const { results } = await db.prepare(`
        SELECT
            u.username,
            u.id as user_id,
            COUNT(*) as total_guesses,
            SUM(CASE WHEN g.was_correct = 1 THEN 1 ELSE 0 END) as correct_guesses,
            ROUND(CAST(SUM(CASE WHEN g.was_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy
        FROM agora_game_guesses g
        JOIN users u ON g.user_id = u.id
        WHERE g.round_id = ?
        GROUP BY g.user_id
        HAVING total_guesses >= 3
        ORDER BY accuracy DESC, correct_guesses DESC
        LIMIT 20
    `).bind(roundId).all();

    return results || [];
}

// ── Writing Challenges ──

/**
 * Get active challenges
 */
export async function getActiveChallenges(db) {
    const { results } = await db.prepare(`
        SELECT id, title, description, prompt_text, constraint_type, constraint_value, start_date, end_date, locale
        FROM writing_challenges
        WHERE is_active = 1
        AND end_date >= date('now')
        ORDER BY start_date ASC
    `).all();

    return results || [];
}

/**
 * Get challenge entries with user info
 */
export async function getChallengeEntries(db, challengeId) {
    const { results } = await db.prepare(`
        SELECT ce.*, u.username, w.title as writing_title, w.word_count
        FROM challenge_entries ce
        JOIN users u ON ce.user_id = u.id
        LEFT JOIN writings w ON ce.writing_id = w.id
        WHERE ce.challenge_id = ?
        ORDER BY ce.votes DESC, ce.submitted_at ASC
    `).bind(challengeId).all();

    return results || [];
}
