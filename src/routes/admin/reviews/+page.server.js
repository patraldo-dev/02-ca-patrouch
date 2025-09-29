// src/routes/admin/reviews/+page.server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, locals }) {
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
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
            FROM reviews r
            JOIN books b ON r.book_id = b.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `).all();
        
        return {
            reviews: results,
            user: locals.user || null  // Pass user from locals (set by hooks.server.js)
        };
    } catch (err) {
        console.error('Error fetching reviews:', err);
        throw error(500, 'Failed to fetch reviews');
    }
}
