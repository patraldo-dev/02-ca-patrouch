// src/routes/api/books/[id]/reviews/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals, params }) {
    try {
        // Check if user is logged in
        if (!locals.user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401 }
            );
        }

        const { rating, content } = await request.json();
        const { id: bookId } = params;
        const db = locals.db;

        // Validate
        if (!rating || !content) {
            return new Response(
                JSON.stringify({ error: 'Missing fields' }),
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return new Response(
                JSON.stringify({ error: 'Rating must be 1-5' }),
                { status: 400 }
            );
        }

        if (content.length < 10) {
            return new Response(
                JSON.stringify({ error: 'Review must be at least 10 characters' }),
                { status: 400 }
            );
        }

        // Check if book exists
        const bookCheck = await db.prepare(`
            SELECT id FROM books WHERE id = ?
        `).bind(bookId).all();

        if (bookCheck.results.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Book not found' }),
                { status: 404 }
            );
        }

        // Insert review
        const reviewId = crypto.randomUUID();
        const userId = locals.user.id;

        await db.prepare(`
            INSERT INTO reviews (id, user_id, book_id, rating, content)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            reviewId,
            userId,
            bookId,
            parseInt(rating),
            content
        ).run();

        return new Response(
            JSON.stringify({ success: true, reviewId }),
            { status: 200 }
        );

    } catch (error) {
        console.error('Post review error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500 }
        );
    }
}
