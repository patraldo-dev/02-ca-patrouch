import { redirect } from '@sveltejs/kit';
import { getTodayData } from '$lib/server/writing-stats.js';

export async function load({ locals }) {
  if (!locals.user) return { user: null };

  const db = locals.db;
  const ai = locals.platform?.env?.AI;

  // Get today's prompt + stats server-side (no client-side loading state needed)
  let todayData;
  try {
    todayData = await getTodayData(db, ai, locals.user.id);
  } catch (err) {
    console.error('Failed to load today data:', err);
    todayData = {
      prompt: { id: null, prompt_text: 'Write freely today — the muse is resting.', category: 'free writing' },
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

  return {
    user: locals.user,
    prompt: todayData.prompt,
    userAction: todayData.userAction,
    acceptedPromptId: todayData.acceptedPromptId,
    passesRemaining: todayData.passesRemaining,
    passesUsed: todayData.passesUsed,
    dailyPassLimit: todayData.dailyPassLimit,
    stats: todayData.stats,
    recentWritings
  };
}
