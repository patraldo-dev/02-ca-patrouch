import { json } from '@sveltejs/kit';
import { getTodayData } from '$lib/server/writing-stats.js';

export async function GET(event) {
  const user = event.locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = event.locals.db;
  const ai = event.platform?.env?.AI;

  try {
    const data = await getTodayData(db, ai, user.id);
    return json(data);
  } catch (err) {
    console.error('GET /api/write/today error:', err);
    return json({
      prompt: { id: null, prompt_text: 'Write freely today — the muse is resting.', category: 'free writing' },
      userAction: null,
      acceptedPromptId: null,
      passesRemaining: 3,
      passesUsed: 0,
      dailyPassLimit: 3,
      stats: { total_writings: 0, total_words: 0, current_streak: 0, longest_streak: 0, prompts_accepted: 0, prompts_passed: 0 }
    });
  }
}
