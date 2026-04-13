import { redirect } from '@sveltejs/kit';
import { getTodayData } from '$lib/server/writing-stats.js';
import { getWritingHeatmapData, getCurrentWriterOfTheWeek, getAllBadgesWithStatus } from '$lib/server/engagement.js';
import { getTranslation } from '$lib/i18n/server.js';
import { getDailyArtwork } from '$lib/server/art-prompt.js';

export async function load({ locals, url }) {
  if (!locals.user) return { user: null };

  const db = locals.db;
  const ai = locals.platform?.env?.AI;
  const lang = locals.locale || 'es';
  const t = getTranslation(lang);
  const locale = ['en', 'es', 'fr'].includes(lang) ? lang : 'es';

  // Get today's prompt + stats server-side (no client-side loading state needed)
  let todayData;
  try {
    todayData = await getTodayData(db, ai, locals.user.id, locale);
  } catch (err) {
    console.error('Failed to load today data:', err);
    todayData = {
      prompt: { id: null, prompt_text: t('write.dashboard.fallback_prompt'), category: 'free writing' },
      userAction: null,
      acceptedPromptId: null,
      passesRemaining: 3,
      passesUsed: 0,
      dailyPassLimit: 3,
      stats: null
    };
  }

  // Get recent writings
  let recentWritings = [];
  try {
    const { results } = await db.prepare(
      'SELECT w.id, w.title, w.word_count, w.status, w.visibility, w.created_at FROM writings w WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT 5'
    ).bind(locals.user.id).all();
    recentWritings = results || [];
  } catch (e) {}

  // Get heatmap data
  let heatmapData = {};
  try {
    heatmapData = await getWritingHeatmapData(db, locals.user.id);
  } catch (e) {}

  // Get Writer of the Week
  let writerOfTheWeek = null;
  try {
    writerOfTheWeek = await getCurrentWriterOfTheWeek(db);
  } catch (e) {}

  // Get badges with unlock status
  let userBadges = [];
  try {
    userBadges = await getAllBadgesWithStatus(db, locals.user.id);
  } catch (e) {}

  // Get latest draft for today (if any)
  let latestDraft = null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    latestDraft = await db.prepare(
      `SELECT w.id, w.title, w.content, w.visibility FROM writings w 
       WHERE w.user_id = ? AND w.status = 'draft' AND w.created_at >= ? 
       ORDER BY w.updated_at DESC, w.created_at DESC LIMIT 1`
    ).bind(locals.user.id, today).first();
  } catch (e) {}

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
    latestDraft
  };
}
