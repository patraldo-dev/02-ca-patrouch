const BADGE_THRESHOLDS = {
  streak: [
    { value: 7, badgeId: "badge_002" },
    { value: 30, badgeId: "badge_003" },
    { value: 100, badgeId: "badge_004" }
  ],
  total_words: [
    { value: 1e3, badgeId: "badge_005" },
    { value: 1e4, badgeId: "badge_006" },
    { value: 5e4, badgeId: "badge_007" },
    { value: 1e5, badgeId: "badge_008" }
  ],
  writings_count: [
    { value: 1, badgeId: "badge_001" },
    { value: 10, badgeId: "badge_013" },
    { value: 50, badgeId: "badge_014" }
  ]
};
async function checkAndUnlockBadges(db, userId, stats) {
  const unlocked = [];
  if (stats?.current_streak) {
    for (const threshold of BADGE_THRESHOLDS.streak) {
      if (stats.current_streak >= threshold.value) {
        const got = await tryUnlockBadge(db, userId, threshold.badgeId, `streak:${stats.current_streak}`);
        if (got) unlocked.push(got);
      }
    }
  }
  if (stats?.total_words) {
    for (const threshold of BADGE_THRESHOLDS.total_words) {
      if (stats.total_words >= threshold.value) {
        const got = await tryUnlockBadge(db, userId, threshold.badgeId, `words:${stats.total_words}`);
        if (got) unlocked.push(got);
      }
    }
  }
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
async function tryUnlockBadge(db, userId, badgeId, context) {
  try {
    await db.prepare(`
            INSERT OR IGNORE INTO user_badges (id, user_id, badge_id, context)
            VALUES (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), ?, ?, ?)
        `).bind(userId, badgeId, context).run();
    const { results } = await db.prepare(`
            SELECT changes() as changed
        `).all();
    const badge = await db.prepare(`
            SELECT b.id, b.slug, b.name, b.description, b.icon, b.category, b.rarity
            FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ? AND ub.badge_id = ?
        `).bind(userId, badgeId).first();
    return badge;
  } catch (e) {
    console.error("Badge unlock error:", e);
    return null;
  }
}
async function getAllBadgesWithStatus(db, userId) {
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
  (userBadges || []).forEach((ub) => {
    unlockedMap[ub.badge_id] = ub.unlocked_at;
  });
  return (allBadges || []).map((b) => ({
    ...b,
    unlocked: !!unlockedMap[b.id],
    unlockedAt: unlockedMap[b.id] || null
  }));
}
async function getWritingHeatmapData(db, userId) {
  const { results } = await db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(word_count) as words
        FROM writings
        WHERE user_id = ?
        AND created_at >= datetime('now', '-365 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `).bind(userId).all();
  const data = {};
  (results || []).forEach((row) => {
    data[row.date] = { count: row.count, words: row.words || 0 };
  });
  return data;
}
async function getCurrentWriterOfTheWeek(db) {
  const now = /* @__PURE__ */ new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const result = await db.prepare(`
        SELECT wotw.*, u.username, u.id as user_uuid
        FROM writer_of_the_week wotw
        JOIN users u ON wotw.user_id = u.id
        WHERE wotw.week_start = ?
    `).bind(weekStartStr).first();
  return result || null;
}
async function getAgoraLeaderboard(db, roundId) {
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
async function getActiveChallenges(db) {
  const { results } = await db.prepare(`
        SELECT id, title, description, prompt_text, constraint_type, constraint_value, start_date, end_date, locale
        FROM writing_challenges
        WHERE is_active = 1
        AND end_date >= date('now')
        ORDER BY start_date ASC
    `).all();
  return results || [];
}
async function getChallengeEntries(db, challengeId) {
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
export {
  getChallengeEntries as a,
  getActiveChallenges as b,
  getCurrentWriterOfTheWeek as c,
  getAllBadgesWithStatus as d,
  getWritingHeatmapData as e,
  checkAndUnlockBadges as f,
  getAgoraLeaderboard as g
};
