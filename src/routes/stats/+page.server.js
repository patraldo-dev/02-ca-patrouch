import { redirect } from "@sveltejs/kit";
import { getBadgeCatalog } from "#lib/server/badges.js";

export async function load({ locals }) {
  const user = locals?.user;
  if (!user) throw redirect(302, "/login?redirect=/stats");

  const db = locals.db;
  if (!db)
    return { user, writings: [], totalWords: 0, badges: getBadgeCatalog() };

  const writings = await db
    .prepare(
      "SELECT id, title, created_at, word_count, locale, status FROM writings WHERE user_id = ? ORDER BY created_at DESC LIMIT 365",
    )
    .bind(user.id)
    .all();

  const totalWords = await db
    .prepare(
      "SELECT COALESCE(SUM(word_count), 0) as total FROM writings WHERE user_id = ?",
    )
    .bind(user.id)
    .first();

  const unlockedBadges = await db
    .prepare("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?")
    .bind(user.id)
    .all();

  return {
    user,
    writings: writings.results || [],
    totalWords: totalWords?.total || 0,
    heatmapData: buildHeatmapData(writings.results || []),
    badges: getBadgeCatalog(unlockedBadges.results || []),
  };
}

// Accepts epoch seconds/ms, epoch-as-string, or "YYYY-MM-DD HH:MM:SS"
// (SQLite datetime('now')). Returns null for anything unparseable.
function toDate(v) {
  if (v == null) return null;
  const n = Number(v);
  if (!isNaN(n) && String(v).trim() === String(n)) {
    return new Date(n < 1e12 ? n * 1000 : n);
  }
  const d = new Date(String(v).replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d;
}

function buildHeatmapData(writings) {
  const map = {};
  for (const w of writings) {
    // created_at mixes epochs and datetime strings across the site's history
    const d = toDate(w.created_at);
    if (!d) continue;
    const dateStr = d.toISOString().split("T")[0];
    if (!map[dateStr]) map[dateStr] = { count: 0, words: 0 };
    map[dateStr].count++;
    map[dateStr].words += w.word_count || 0;
  }
  return map;
}
