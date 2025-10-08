import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  loaders: [
    // ─── English ───────────────────────────────────────
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./locales/en/common.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.admin',
      loader: async () => (await import('./locales/en/pages/admin.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.about',
      loader: async () => (await import('./locales/en/pages/about.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.blog',
      loader: async () => (await import('./locales/en/pages/blog.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.books',
      loader: async () => (await import('./locales/en/pages/books.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.home',
      loader: async () => (await import('./locales/en/pages/home.json')).default,
    },
    {
      locale: 'en',
      key: 'pages.privacy',
      loader: async () => (await import('./locales/en/pages/privacy.json')).default,
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

    // ─── Spanish ───────────────────────────────────────
    {
      locale: 'es',
      key: 'common',
      loader: async () => (await import('./locales/es/common.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.admin',
      loader: async () => (await import('./locales/es/pages/admin.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.about',
      loader: async () => (await import('./locales/es/pages/about.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.blog',
      loader: async () => (await import('./locales/es/pages/blog.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.books',
      loader: async () => (await import('./locales/es/pages/books.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.home',
      loader: async () => (await import('./locales/es/pages/home.json')).default,
    },
    {
      locale: 'es',
      key: 'pages.privacy',
      loader: async () => (await import('./locales/es/pages/privacy.json')).default,
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

    // ─── French ───────────────────────────────────────
    {
      locale: 'fr',
      key: 'common',
      loader: async () => (await import('./locales/fr/common.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.admin',
      loader: async () => (await import('./locales/fr/pages/admin.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.about',
      loader: async () => (await import('./locales/fr/pages/about.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.blog',
      loader: async () => (await import('./locales/fr/pages/blog.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.books',
      loader: async () => (await import('./locales/fr/pages/books.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.home',
      loader: async () => (await import('./locales/fr/pages/home.json')).default,
    },
    {
      locale: 'fr',
      key: 'pages.privacy',
      loader: async () => (await import('./locales/fr/pages/privacy.json')).default,
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

export const { t, locale, locales, loadTranslations } = new i18n(config);
