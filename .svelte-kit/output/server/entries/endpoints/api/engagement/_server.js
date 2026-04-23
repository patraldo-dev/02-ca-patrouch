import { json } from "@sveltejs/kit";
import { g as getAgoraLeaderboard, a as getChallengeEntries, b as getActiveChallenges, d as getCurrentWriterOfTheWeek, e as getAllBadgesWithStatus, f as getWritingHeatmapData } from "../../../../chunks/engagement.js";
async function GET({ url, platform, locals }) {
  try {
    const db = platform?.env?.DB_book;
    if (!db) {
      return json({ error: "Database unavailable" }, { status: 503 });
    }
    const type = url.searchParams.get("type");
    const userId = locals.user?.id;
    if (!userId) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    switch (type) {
      case "heatmap": {
        const data = await getWritingHeatmapData(db, userId);
        return json({ heatmap: data });
      }
      case "badges": {
        const badges = await getAllBadgesWithStatus(db, userId);
        return json({ badges });
      }
      case "writer-of-week": {
        const writer = await getCurrentWriterOfTheWeek(db);
        return json({ writer });
      }
      case "challenges": {
        const challenges = await getActiveChallenges(db);
        return json({ challenges });
      }
      case "challenge-entries": {
        const challengeId = url.searchParams.get("challengeId");
        if (!challengeId) {
          return json({ error: "challengeId required" }, { status: 400 });
        }
        const entries = await getChallengeEntries(db, challengeId);
        return json({ entries });
      }
      case "agora-leaderboard": {
        const roundId = url.searchParams.get("roundId");
        if (!roundId) {
          return json({ error: "roundId required" }, { status: 400 });
        }
        const leaderboard = await getAgoraLeaderboard(db, roundId);
        return json({ leaderboard });
      }
      default:
        return json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (error) {
    console.error("Engagement API error:", error);
    return json({ error: "Failed to fetch engagement data" }, { status: 500 });
  }
}
export {
  GET
};
