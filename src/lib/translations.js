import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  loaders: [
    // Spanish (default)
    {
      locale: 'es',
      key: 'common',
      loader: async () => (await import('./locales/es/common.json')).default,
    },
    // English
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./locales/en/common.json')).default,
    },
    // French (Canadian)
    {
      locale: 'fr',
      key: 'common',
      loader: async () => (await import('./locales/fr/common.json')).default,
    },
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
