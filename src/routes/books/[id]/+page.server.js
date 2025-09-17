// src/routes/books/[id]/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params }) {
    const { db } = locals;
    const { id } = params;

    // Fetch book (same as before)
    const bookStmt = db.prepare(`
        SELECT * FROM books WHERE id = ?
    `);
    const { results: [book] } = await bookStmt.bind(id).all();
    if (!book) {
        throw error(404, 'Book not found');
    }

    // Fetch reviews (same as before)
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

    // Return book, reviews, and current user
    return {
        book: {
            ...book,
            reviews: reviewsWithComments
        },
        user: locals.user // ← Add this line
    };
}
