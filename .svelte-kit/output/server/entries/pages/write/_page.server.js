import "@sveltejs/kit";
import { c as getTodayData } from "../../../chunks/writing-stats.js";
import { f as getWritingHeatmapData, d as getCurrentWriterOfTheWeek, e as getAllBadgesWithStatus } from "../../../chunks/engagement.js";
import { f as fr, e as es, a as en } from "../../../chunks/fr.js";
import { g as getDailyArtwork } from "../../../chunks/art-prompt.js";
const locales = { en, es, fr };
function getTranslation(locale = "es") {
  const translation = locales[locale] || locales.es;
  return function(key) {
    let result = translation[key];
    if (!result) {
      result = translation[key.toLowerCase()];
    }
    if (!result && locale !== "es") {
      result = locales.es[key] || locales.es[key.toLowerCase()];
    }
    return result || key;
  };
}
const server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getTranslation
}, Symbol.toStringTag, { value: "Module" }));
async function load({ locals, url }) {
  if (!locals.user) return { user: null };
  const db = locals.db;
  const ai = locals.platform?.env?.AI;
  const lang = locals.locale || "es";
  const t = getTranslation(lang);
  const locale = ["en", "es", "fr"].includes(lang) ? lang : "es";
  let todayData;
  try {
    todayData = await getTodayData(db, ai, locals.user.id, locale);
  } catch (err) {
    console.error("Failed to load today data:", err);
    todayData = {
      prompt: { id: null, prompt_text: t("write.dashboard.fallback_prompt"), category: "free writing" },
      userAction: null,
      acceptedPromptId: null,
      passesRemaining: 3,
      passesUsed: 0,
      dailyPassLimit: 3,
      stats: null
    };
  }
  let recentWritings = [];
  try {
    const { results } = await db.prepare(
      "SELECT w.id, w.title, w.word_count, w.status, w.visibility, w.created_at FROM writings w WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT 5"
    ).bind(locals.user.id).all();
    recentWritings = results || [];
  } catch (e) {
  }
  let heatmapData = {};
  try {
    heatmapData = await getWritingHeatmapData(db, locals.user.id);
  } catch (e) {
  }
  let writerOfTheWeek = null;
  try {
    writerOfTheWeek = await getCurrentWriterOfTheWeek(db);
  } catch (e) {
  }
  let userBadges = [];
  try {
    userBadges = await getAllBadgesWithStatus(db, locals.user.id);
  } catch (e) {
  }
  let latestDraft = null;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const acceptedId = todayData.acceptedPromptId;
    if (acceptedId) {
      latestDraft = await db.prepare(
        `SELECT w.id, w.title, w.content, w.visibility FROM writings w 
         WHERE w.user_id = ? AND w.status = 'draft' AND w.prompt_id = ?
         ORDER BY w.updated_at DESC, w.created_at DESC LIMIT 1`
      ).bind(locals.user.id, acceptedId).first();
    }
  } catch (e) {
  }
  let agoraExcerpts = [];
  try {
    const { results: excerpts } = await db.prepare(
      `SELECT w.content, u.username, u.display_name FROM writings w
       JOIN users u ON w.user_id = u.id
       WHERE w.status = 'published' AND w.visibility = 'public' AND length(w.content) > 50
       ORDER BY w.created_at DESC LIMIT 10`
    ).all();
    agoraExcerpts = (excerpts || []).map((w) => {
      const text = (w.content || "").trim();
      const sentence = text.match(/^[^.!?]+[.!?]/);
      const snippet = sentence ? sentence[0].trim() : text.slice(0, 120).trim();
      const author = w.display_name || w.username;
      return { text: snippet, author };
    });
  } catch (e) {
  }
  let tickerQuotes = [];
  try {
    const loc = locals.locale || "es";
    const { getTranslation: getTranslation2 } = await Promise.resolve().then(() => server);
    const t2 = getTranslation2(loc);
    const staticKeys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const staticQuotes = staticKeys.map((i) => t2(`write.inspiration.${i}`)).filter(Boolean);
    const excerpts = agoraExcerpts.map((e) => `"${e.text}" — ${e.author}`);
    const mixed = [];
    const maxLen = Math.max(staticQuotes.length, excerpts.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < staticQuotes.length) mixed.push(staticQuotes[i]);
      if (i < excerpts.length) mixed.push(excerpts[i]);
    }
    tickerQuotes = mixed;
  } catch (e) {
  }
  return {
    user: locals.user,
    prompt: todayData.prompt,
    promptSource: todayData.promptSource,
    userAction: todayData.userAction,
    acceptedPromptId: todayData.acceptedPromptId,
    passesRemaining: todayData.passesRemaining,
    passesUsed: todayData.passesUsed,
    dailyPassLimit: todayData.dailyPassLimit,
    stats: todayData.stats,
    recentWritings,
    artwork: getDailyArtwork(),
    heatmapData,
    writerOfTheWeek,
    userBadges,
    latestDraft,
    agoraExcerpts,
    tickerQuotes,
    serverLocale: locals.locale || "es"
  };
}
export {
  load
};
