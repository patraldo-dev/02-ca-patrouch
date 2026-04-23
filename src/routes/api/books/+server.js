// src/routes/api/books/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        // Only fetch books that have valid titles, authors, and covers
        const { results } = await db.prepare(`
            SELECT 
                b.id, 
                b.title, 
                b.author, 
                b.description, 
                b.coverImageId,
                b.slug,
                b.published_year,
                AVG(r.rating) as avg_rating,
                COUNT(r.id) as review_count
            FROM books b
            LEFT JOIN reviews r ON b.id = r.book_id
            WHERE 
                b.title IS NOT NULL 
                AND b.title != ''
                AND b.author IS NOT NULL 
                AND b.author != ''
                AND (b.coverImageId IS NOT NULL)
            GROUP BY b.id
            ORDER BY b.title ASC
        `).all();
        
        return json(results);
    } catch (error) {
        console.error('Error fetching books:', error);
        return json({ error: 'Failed to fetch books' }, { status: 500 });
    }
}
