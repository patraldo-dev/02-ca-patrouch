// src/routes/api/admin/blog/+server.js
import { marked } from 'marked';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const isPublished = published === true; // ← Ensure it's boolean
        const db = locals.db;

        // Validate
        if (!title || !slug || !content) {
            return new Response(JSON.stringify({ error: 'Title, slug, and content required' }), { status: 400 });
        }

        // Check slug uniqueness
        const existing = await db.prepare(`
            SELECT id FROM blog_posts WHERE slug = ?
        `).bind(slug).first();

        if (existing) {
            return new Response(JSON.stringify({ error: 'Slug already exists' }), { status: 400 });
        }

        // Generate ID
        const postId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);

        // Insert post
        await db.prepare(`
            INSERT INTO blog_posts (id, title, slug, content, published_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            postId,
            title,
            slug,
            content,
            published ? now : null,
            now,
            now
        ).run();

        return new Response(JSON.stringify({ success: true, postId }), { status: 200 });

    } catch (error) {
        console.error('Save blog post error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
