// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';

export const load = async ({ url, cookies, locals }) => {
  // ✅ Get locale from cookie (server-safe)
  const savedLocale = cookies.get('preferredLanguage') || 'en';
  const initLocale = ['en', 'es', 'fr'].includes(savedLocale) ? savedLocale : 'en';

  await loadTranslations(initLocale, url.pathname);

  // ✅ Return user data from hooks.server.js
  return {
    locale: initLocale,
    user: locals.user // includes email_verified
  };
};
