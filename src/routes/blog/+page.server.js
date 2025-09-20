// src/routes/blog/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
    const { results: posts } = await locals.db.prepare(`
        SELECT id, title, slug, published_at
        FROM blog_posts
        WHERE published_at IS NOT NULL
        ORDER BY published_at DESC
    `).all();

    return {
        posts: posts.map(post => ({
            ...post,
            publishedAt: new Date(post.published_at * 1000)
        }))
    };
}
