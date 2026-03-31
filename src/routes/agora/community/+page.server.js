import { getCommunityResponses } from '$lib/server/writing-stats.js';

export async function load({ url, locals }) {
  const locale = url.searchParams.get('locale') || null;

  const groups = await getCommunityResponses(locals.db, {
    locale: ['en', 'es', 'fr'].includes(locale) ? locale : null
  });

  return {
    user: locals.user || null,
    groups,
    filters: { locale }
  };
}
