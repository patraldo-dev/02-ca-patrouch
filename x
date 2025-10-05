// In your config.loaders array...

// English
{
  locale: 'en',
  key: 'pages.about',
  loader: async () => (await import('./locales/en/pages/about.json')).default,
},
// Spanish
{
  locale: 'es',
  key: 'pages.about',
  loader: async () => (await import('./locales/es/pages/about.json')).default,
},
// French
{
  locale: 'fr',
  key: 'pages.about',
  loader: async () => (await import('./locales/fr/pages/about.json')).default,
},
