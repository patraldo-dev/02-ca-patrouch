import { json } from "@sveltejs/kit";
import { c as getTodayData } from "../../../../../chunks/writing-stats.js";
function getUrlLocale(event) {
  const q = event.url.searchParams.get("locale");
  if (["en", "es", "fr"].includes(q)) return q;
  const cookie = event.cookies.get("locale");
  if (["en", "es", "fr"].includes(cookie)) return cookie;
  const accept = event.request.headers.get("accept-language") || "";
  if (accept.startsWith("fr")) return "fr";
  if (accept.startsWith("es")) return "es";
  return "en";
}
async function GET(event) {
  const user = event.locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = event.locals.db;
  const ai = event.platform?.env?.AI;
  const locale = getUrlLocale(event) || "en";
  try {
    const data = await getTodayData(db, ai, user.id, locale);
    return json(data);
  } catch (err) {
    console.error("GET /api/write/today error:", err);
    return json({
      prompt: { id: null, prompt_text: "Write freely today — the muse is resting.", category: "free writing" },
      userAction: null,
      acceptedPromptId: null,
      passesRemaining: 3,
      passesUsed: 0,
      dailyPassLimit: 3,
      stats: { total_writings: 0, total_words: 0, current_streak: 0, longest_streak: 0, prompts_accepted: 0, prompts_passed: 0 }
    });
  }
}
export {
  GET
};
