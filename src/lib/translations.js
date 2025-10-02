import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  loaders: [
    // Spanish
    {
      locale: 'es',
      key: 'common',
      loader: async () => (await import('./locales/es/common.json')).default,
    },
{
  locale: 'es',
  key: 'pages.blog',
  loader: async () => (await import('./locales/es/pages/blog.json')).default,
},
{
  locale: 'es',
  key: 'pages.reviews',
  loader: async () => (await import('./locales/es/pages/reviews.json')).default,
},
    {
      locale: 'es',
      key: 'pages.bookReview',
      loader: async () => (await import('./locales/es/pages/bookReview.json')).default,
    },

    // English
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./locales/en/common.json')).default,
    },
{
  locale: 'en',
  key: 'pages.blog',
  loader: async () => (await import('./locales/en/pages/blog.json')).default,
},
    {
  locale: 'en',
  key: 'pages.reviews',
  loader: async () => (await import('./locales/en/pages/reviews.json')).default,
},
{
      locale: 'en',
      key: 'pages.bookReview',
      loader: async () => (await import('./locales/en/pages/bookReview.json')).default,
    },

    // French (Canadian)
    {
      locale: 'fr',
      key: 'common',
      loader: async () => (await import('./locales/fr/common.json')).default,
    },
{
  locale: 'fr',
  key: 'pages.blog',
  loader: async () => (await import('./locales/fr/pages/blog.json')).default,
},
{
  locale: 'fr',
  key: 'pages.reviews',
  loader: async () => (await import('./locales/fr/pages/reviews.json')).default,
},
    {
      locale: 'fr',
      key: 'pages.bookReview',
      loader: async () => (await import('./locales/fr/pages/bookReview.json')).default,
    },
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
