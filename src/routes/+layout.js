// src/routes/+layout.js
import { locale, setLocale } from '$lib/i18n';
import { browser } from '$app/environment';

/** @type {import('./$types').LayoutLoad} */
export async function load({ url, data }) {
  // Use server-provided locale first (from cookie), then localStorage fallback
  let initLocale = data.serverLocale || 'es';

  if (browser) {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && ['es', 'en', 'fr'].includes(saved)) {
      initLocale = saved;
    }
  }

  setLocale(initLocale);

  return { ...data };
}
