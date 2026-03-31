import { json } from '@sveltejs/kit';
import { getPublicWritings } from '$lib/server/writing-stats.js';

export async function GET(event) {
  const url = new URL(event.request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 12;
  const locale = url.searchParams.get('locale') || null;
  const category = url.searchParams.get('category') || null;

  const result = await getPublicWritings(event.locals.db, {
    page,
    limit,
    locale: ['en', 'es', 'fr'].includes(locale) ? locale : null,
    category: category || null
  });

  return json(result);
}
