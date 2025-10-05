// In your config.loaders array...

// English
{
  locale: 'en',
  key: 'pages.privacy',
  loader: async () => (await import('./locales/en/pages/privacy.json')).default,
},
// Spanish
{
  locale: 'es',
  key: 'pages.privacy',
  loader: async () => (await import('./locales/es/pages/privacy.json')).default,
},
// French
{
  locale: 'fr',
  key: 'pages.privacy',
  loader: async () => (await import('./locales/fr/pages/privacy.json')).default,
},
