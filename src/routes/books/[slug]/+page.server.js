// src/routes/books/[slug]/+page.server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        throw error(404, 'Database not available');
    }

    const { slug } = params;
    console.log('Loading book with slug:', slug); // Debug log

    // Check if slug is valid
    if (!slug || slug === 'undefined') {
        throw error(400, 'Invalid book slug');
    }

    // Fetch book by slug
    const bookStmt = db.prepare(`
        SELECT * FROM books WHERE slug = ?
    `);
    const { results: [book] } = await bookStmt.bind(slug).all();
    
    if (!book) {
        // Try case-insensitive search as a fallback
        console.log('Book not found with exact slug, trying case-insensitive search');
        const allBooksStmt = db.prepare("SELECT * FROM books");
        const { results: allBooks } = await allBooksStmt.all();
        const caseInsensitiveMatch = allBooks.find(b => 
            b.slug && b.slug.toLowerCase() === slug.toLowerCase()
        );
        
        if (!caseInsensitiveMatch) {
            console.log('Book not found even with case-insensitive search');
            throw error(404, 'Book not found');
        }
        
        console.log('Found book with case-insensitive match:', caseInsensitiveMatch);
        return {
            book: {
                ...caseInsensitiveMatch,
                reviews: []
            }
        };
    }

    console.log('Book found:', book);

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
    const { results: reviews } = await reviewsStmt.bind(book.id).all();

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
