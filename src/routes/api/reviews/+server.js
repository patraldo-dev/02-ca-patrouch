// src/routes/api/reviews/+server.js
import { json, error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        // Fetch all reviews with book and user information
        const { results } = await db.prepare(`
            SELECT 
                r.id,
                r.content,
                r.rating,
                r.created_at,
                r.book_id,
                b.title as book_title,
                b.slug as book_slug,
                u.username as reviewer_name
        (SELECT COUNT(*) FROM reviews WHERE book_id = r.book_id) as review_count
            FROM reviews r
            JOIN books b ON r.book_id = b.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `).all();
        
        return json(results);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        return json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
