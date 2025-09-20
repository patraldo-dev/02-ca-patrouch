// src/routes/blog/[slug]/+page.server.js
import { marked } from 'marked';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
    const { slug } = params;

    const post = await locals.db.prepare(`
        SELECT title, slug, content, published_at
        FROM blog_posts
        WHERE slug = ? AND published_at IS NOT NULL
    `).bind(slug).first();

    if (!post) {
        throw error(404, 'Post not found');
    }

    // Convert Markdown to HTML
    const htmlContent = marked.parse(post.content);

    return {
        post: {
            ...post,
            content: htmlContent,
            publishedAt: new Date(post.published_at * 1000)
        }
    };
}
