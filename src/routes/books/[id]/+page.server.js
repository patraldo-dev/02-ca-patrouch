// src/routes/books/[id]/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params }) {
    const { db } = locals;
    const { id } = params;

    // Fetch book
    const bookStmt = db.prepare(`
        SELECT * FROM books WHERE id = ?
    `);
    const { results: [book] } = await bookStmt.bind(id).all();
    if (!book) {
        throw error(404, 'Book not found');
    }

    // Fetch reviews for this book
    const reviewsStmt = db.prepare(`
        SELECT 
            r.id,
            r.content,
            r.rating,
            r.created_at,
            u.username as author_username,
            u.id as author_id
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
                c.id,
                c.content,
                c.created_at,
                u.username as author_username,
                u.id as author_id
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.review_id = ?
            ORDER BY c.created_at ASC
        `);
        const { results: comments } = await commentsStmt.bind(review.id).all();

        const formattedComments = comments.map(row => ({
            id: row.id,
            content: row.content,
            created_at: new Date(row.created_at * 1000).toISOString(),
            user: {
                id: row.author_id,
                username: row.author_username
            }
        }));

        return {
            ...review,
            comments: formattedComments
        };
    }));

    return {
        book: {
            ...book,
            reviews: reviewsWithComments
        }
    };
}
