// @ts-nocheck
// src/routes/+layout.js
import { locale, setLocale } from '$lib/i18n';

/** @param {Parameters<import('./$types').LayoutLoad>[0]} event */
export async function load({ data }) {
  // Server already determined the locale from the cookie
  // Just set the store and sync localStorage
  const initLocale = data.serverLocale || 'es';
  setLocale(initLocale);

  return { ...data };
}
