// src/routes/books/+page.server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    
    // Fetch books with average rating and review count
    const { results } = await db.prepare(`
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.description, 
            b.coverImageId,
            b.slug,
            b.published_year,
            ROUND(AVG(r.rating), 1) AS avg_rating,
            COUNT(r.id) AS review_count
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        GROUP BY b.id, b.title, b.author, b.description, b.coverImageId, b.slug, b.published_year
        ORDER BY b.title ASC
    `).all();
    
    return {
        books: results.map(book => ({
            ...book,
            // Convert NULL avg_rating to null (not "null" string)
            avg_rating: book.avg_rating !== null ? parseFloat(book.avg_rating) : null,
            review_count: parseInt(book.review_count) || 0
        }))
    };
}
