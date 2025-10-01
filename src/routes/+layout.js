// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';

/** @type {import('./$types').LayoutLoad} */
export async function load({ url, cookies, locals }) {
  const { pathname } = url;

  // ✅ 1. Get locale from cookie (server-safe)
  let initLocale = cookies.get('preferredLanguage') || 'es';
  if (!['es', 'en', 'fr'].includes(initLocale)) {
    initLocale = 'es';
  }

  // ✅ 2. Load translations
  await loadTranslations(initLocale, pathname);

  // ✅ 3. Return user data from hooks.server.js
  return {
    locale: initLocale,
    user: locals.user // 👈 this makes $page.data.user available
  };
}
