import { json } from '@sveltejs/kit';
import { getCommunityResponses } from '$lib/server/writing-stats.js';

export async function GET(event) {
  const url = new URL(event.request.url);
  const locale = url.searchParams.get('locale') || null;
  const limit = parseInt(url.searchParams.get('limit')) || 20;

  const groups = await getCommunityResponses(event.locals.db, {
    locale: ['en', 'es', 'fr'].includes(locale) ? locale : null,
    limit
  });

  return json(groups);
}
