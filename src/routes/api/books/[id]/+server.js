// src/routes/api/books/[id]/+server.js

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals, params }) {
    const { db } = locals;
    const { id } = params;

    // Fetch book
    const bookStmt = db.prepare(`
        SELECT * FROM books WHERE id = ?
    `);
    const { results: [book] } = await bookStmt.bind(id).all();
    if (!book) {
        return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404 });
    }

    // Fetch reviews for this book
    const reviewsStmt = db.prepare(`
        SELECT 
            r.id,
            r.content,
            r.rating,
            r.created_at,
            u.username as author_username
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ?
        ORDER BY r.created_at DESC
    `);
    const { results: reviews } = await reviewsStmt.bind(id).all();

    // Fetch comments for each review
    const reviewsWithComments = await Promise.all(reviews.map(async (review) => {
        const commentsStmt = db.prepare(`
            SELECT 
                c.content,
                c.created_at,
                u.username as author_username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.review_id = ?
            ORDER BY c.created_at ASC
        `);
        const { results: comments } = await commentsStmt.bind(review.id).all();
        return { ...review, comments };
    }));

    return new Response(JSON.stringify({
        ...book,
        reviews: reviewsWithComments
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
