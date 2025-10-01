// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';
import { browser } from '$app/environment';

/** @type {import('./$types').LayoutLoad} */
export async function load({ url }) {
  const { pathname } = url;
  
  // Get locale from localStorage (client) or default to Spanish
  let initLocale = 'es';
  
  if (browser) {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && ['es', 'en', 'fr'].includes(saved)) {
      initLocale = saved;
    }
  }
  
  await loadTranslations(initLocale, pathname);
  
  return {};
}
