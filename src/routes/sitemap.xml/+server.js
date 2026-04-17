import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
    const db = locals.db;

    const site = 'https://patrouch.ca';

    // Static pages
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/agora', priority: '0.9', changefreq: 'daily' },
        { url: '/write', priority: '0.8', changefreq: 'daily' },
        { url: '/login', priority: '0.3', changefreq: 'monthly' },
        { url: '/signup', priority: '0.3', changefreq: 'monthly' },
        { url: '/privacy', priority: '0.2', changefreq: 'yearly' },
        { url: '/terms', priority: '0.2', changefreq: 'yearly' },
    ];

    // Published writings from Agora
    const writings = await db.prepare(`
        SELECT id, updated_at FROM writings
        WHERE status = 'published' AND visibility = 'public'
        ORDER BY updated_at DESC
        LIMIT 500
    `).all();

    const writingPages = (writings.results || []).map(w => ({
        url: `/writings/${w.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: w.updated_at ? w.updated_at.replace(' ', 'T') : undefined
    }));

    const allPages = [...staticPages, ...writingPages];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${site}${p.url}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(sitemap.trim(), {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
