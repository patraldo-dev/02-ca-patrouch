// src/routes/books/[slug]/review/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params, platform }) {
    const { slug } = params;
    const db = platform?.env?.DB_book;

    if (!db) {
        return json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Find book by slug
    const book = await db
        .prepare('SELECT id FROM books WHERE slug = ?')
        .bind(slug)
        .first();

    if (!book) {
        return json({ error: 'Book not found' }, { status: 404 });
    }

    // 2. Parse review data
    const { rating, comment, userId } = await request.json();

    // 3. Basic validation
    if (!userId) {
        return json({ error: 'User must be logged in' }, { status: 401 });
    }

    if (!rating || rating < 1 || rating > 5) {
        return json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (!comment || comment.trim().length < 10) {
        return json({ error: 'Comment must be at least 10 characters' }, { status: 400 });
    }

    // 4. Insert review
    try {
        await db
            .prepare(`
                INSERT INTO reviews (book_id, user_id, rating, comment, created_at)
                VALUES (?, ?, ?, ?, strftime('%s', 'now'))
            `)
            .bind(book.id, userId, rating, comment.trim())
            .run();

        return json({ success: true, message: 'Review added successfully' }, { status: 201 });

    } catch (err) {
        console.error('Failed to insert review:', err);
        return json({ error: 'Failed to add review' }, { status: 500 });
    }
}
