// src/hooks.client.js
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('es', () => import('$lib/locales/es.json'));
register('en', () => import('$lib/locales/en.json'));
register('fr', () => import('$lib/locales/fr.json'));

init({
  fallbackLocale: 'es',
  initialLocale: localStorage.getItem('preferredLanguage') || getLocaleFromNavigator() || 'es'
});
