// src/routes/api/admin/reviews/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { book_id, user_id, rating, content } = await request.json();
        const db = locals.db;

        // Validate
        if (!book_id || !user_id || !rating || !content) {
            return new Response(JSON.stringify({ error: 'All fields required' }), { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return new Response(JSON.stringify({ error: 'Rating must be 1-5' }), { status: 400 });
        }

        // Check book exists
        const bookCheck = await db.prepare(`SELECT id FROM books WHERE id = ?`).bind(book_id).first();
        if (!bookCheck) {
            return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404 });
        }

        // Check user exists
        const userCheck = await db.prepare(`SELECT id FROM users WHERE id = ?`).bind(user_id).first();
        if (!userCheck) {
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
        }

        // Insert review
        const reviewId = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO reviews (id, user_id, book_id, rating, content)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            reviewId,
            user_id,
            book_id,
            parseInt(rating),
            content
        ).run();

        return new Response(JSON.stringify({ success: true, reviewId }), { status: 200 });

    } catch (error) {
        console.error('Add review error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
