import { redirect } from "@sveltejs/kit";
import { e as getWritingHeatmapData, c as getCurrentWriterOfTheWeek, d as getAllBadgesWithStatus } from "../../../chunks/engagement.js";
async function load({ locals }) {
  const user = locals?.user;
  if (!user) throw redirect(302, "/login");
  const db = locals.db;
  if (!db) return { user, profile: { bio: "", avatar_url: "", display_name: "" }, profiles: [], writings: [], heatmapData: {}, writerOfTheWeek: null, userBadges: [], stats: null };
  const baUser = await db.prepare(
    'SELECT name as display_name, image as avatar_url, createdAt as created_at FROM "user" WHERE id = ?'
  ).bind(user.id).first();
  const profileRow = await db.prepare(
    "SELECT bio FROM profiles WHERE user_id = ? AND is_active = 1"
  ).bind(user.id).first();
  const userProfile = { bio: profileRow?.bio || "", avatar_url: baUser?.avatar_url || "", display_name: baUser?.display_name || "", created_at: baUser?.created_at || user.created_at || "" };
  const { results } = await db.prepare(`
        SELECT id, display_name, locale, bio, is_primary, is_active
        FROM profiles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC
    `).bind(user.id).all();
  const { results: writings } = await db.prepare(`
        SELECT w.id, w.title, w.word_count, w.locale, w.status, w.created_at, w.category
        FROM writings w
        WHERE w.user_id = ? AND w.status = 'published' AND w.visibility = 'public'
        ORDER BY w.created_at DESC
        LIMIT 10
    `).bind(user.id).all();
  const vis = await db.prepare("SELECT show_profile FROM users WHERE id = ?").bind(user.id).first();
  let heatmapData = {};
  try {
    heatmapData = await getWritingHeatmapData(db, user.id);
  } catch (e) {
  }
  let writerOfTheWeek = null;
  try {
    writerOfTheWeek = await getCurrentWriterOfTheWeek(db);
  } catch (e) {
  }
  let userBadges = [];
  try {
    userBadges = await getAllBadgesWithStatus(db, user.id);
  } catch (e) {
  }
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
    const streakRows = await db.prepare(`
            SELECT DISTINCT DATE(created_at) as d
            FROM writings WHERE user_id = ? AND status = 'published'
            ORDER BY d DESC
        `).bind(user.id).all();
    const dates = (streakRows.results || []).map((r) => r.d);
    let streak = 0, maxStreak = 0;
    for (const d of dates) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    }
    stats.current_streak = streak;
    stats.longest_streak = maxStreak;
  } catch (e) {
    console.error("Stats error:", e);
  }
  const booty = await db.prepare(`SELECT booty_keywords_opt_in FROM users WHERE id = ?`).bind(user.id).first();
  return { user, profile: userProfile, profiles: results || [], writings: writings || [], showProfile: vis?.show_profile ?? 1, bootyOptIn: booty?.booty_keywords_opt_in ?? 0, heatmapData, writerOfTheWeek, userBadges, stats };
}
export {
  load
};
