// src/routes/+page.server.js
import { error } from '@sveltejs/kit';

export async function load({ platform, locals }) {
    const user = locals.user || null;
    
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    
    const { results } = await db.prepare(`
        SELECT 
            b.id, 
            b.title, 
            b.slug, 
            b.author, 
            b.coverImageId,
            ROUND(AVG(r.rating), 1) AS avg_rating,
            COUNT(r.id) AS review_count
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        WHERE b.published = 1 
        AND b.coverImageId IS NOT NULL
        GROUP BY b.id, b.title, b.slug, b.author, b.coverImageId
        ORDER BY b.published_year DESC NULLS LAST
        LIMIT 12
    `).all();

    return {
        user,
        books: results.map(book => ({
            ...book,
            avg_rating: book.avg_rating !== null ? parseFloat(book.avg_rating) : null,
            review_count: parseInt(book.review_count) || 0
        }))
    };
}
