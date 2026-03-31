import { getPublicWritings } from '$lib/server/writing-stats.js';

export async function load({ url, locals }) {
  const page = parseInt(url.searchParams.get('page')) || 1;
  const locale = url.searchParams.get('locale') || null;
  const category = url.searchParams.get('category') || null;

  const { writings, total, pages } = await getPublicWritings(locals.db, {
    page,
    locale: ['en', 'es', 'fr'].includes(locale) ? locale : null,
    category: category || null
  });

  return {
    user: locals.user || null,
    writings,
    pagination: { page, total, pages },
    filters: { locale, category }
  };
}
