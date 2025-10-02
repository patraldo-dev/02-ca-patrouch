// In your config.loaders array...

// Spanish
{
  locale: 'es',
  key: 'pages.blog',
  loader: async () => (await import('./locales/es/pages/blog.json')).default,
},

// English
{
  locale: 'en',
  key: 'pages.blog',
  loader: async () => (await import('./locales/en/pages/blog.json')).default,
},

// French
{
  locale: 'fr',
  key: 'pages.blog',
  loader: async () => (await import('./locales/fr/pages/blog.json')).default,
},
