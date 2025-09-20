// src/routes/api/comments/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { review_id, content } = await request.json();
        const db = locals.db;

        // Validate
        if (!review_id || !content) {
            return new Response(JSON.stringify({ error: 'Review ID and content required' }), { status: 400 });
        }

        if (content.length < 3) {
            return new Response(JSON.stringify({ error: 'Comment too short' }), { status: 400 });
        }

        if (content.length > 1000) {
            return new Response(JSON.stringify({ error: 'Comment too long' }), { status: 400 });
        }

        // Check review exists
        const review = await db.prepare(`
            SELECT id FROM reviews WHERE id = ?
        `).bind(review_id).first();

        if (!review) {
            return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
        }

        // Insert comment
        const commentId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);

        await db.prepare(`
            INSERT INTO comments (id, review_id, user_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            commentId,
            review_id,
            locals.user.id,
            content,
            now
        ).run();

        // Get user info for response
        const user = await db.prepare(`
            SELECT username FROM users WHERE id = ?
        `).bind(locals.user.id).first();

        const comment = {
            id: commentId,
            review_id,
            user: {
                id: locals.user.id,
                username: user.username
            },
            content,
            created_at: new Date(now * 1000).toISOString()
        };

        return new Response(JSON.stringify({ success: true, comment }), { status: 200 });

    } catch (error) {
        console.error('Post comment error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
    try {
        const reviewId = url.searchParams.get('review_id');
        if (!reviewId) {
            return new Response(JSON.stringify({ error: 'Review ID required' }), { status: 400 });
        }

        const db = locals.db;

        const { results } = await db.prepare(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                u.username as author_username,
                u.id as author_id
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.review_id = ?
            ORDER BY c.created_at ASC
        `).bind(reviewId).all();

        const comments = results.map(row => ({
            id: row.id,
            content: row.content,
            created_at: new Date(row.created_at * 1000).toISOString(),
            user: {
                id: row.author_id,
                username: row.author_username
            }
        }));

        return new Response(JSON.stringify(comments), { status: 200 });

    } catch (error) {
        console.error('Get comments error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
