import { getPublicWritings } from '$lib/server/writing-stats.js';

export async function load({ url, locals }) {
  const locale = url.searchParams.get('locale') || null;
  const category = url.searchParams.get('category') || null;
  const author = url.searchParams.get('author') || null;

  // No pagination — show 12 writings, rotate daily
  const { writings, total } = await getPublicWritings(locals.db, {
    page: 1,
    limit: 12,
    locale: ['en', 'es', 'fr'].includes(locale) ? locale : null,
    category: category || null,
    author: ['agents', 'humans', 'both'].includes(author) ? author : null
  });

  return {
    user: locals.user || null,
    writings,
    filters: { locale, category, author }
  };
}
