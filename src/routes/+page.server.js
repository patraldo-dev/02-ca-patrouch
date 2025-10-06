// src/routes/+page.server.js
import { error } from '@sveltejs/kit';

export async function load({ platform, locals }) {
    // Get user from session (assuming you have auth)
    const user = locals.user || null;
    
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    const { results } = await db.prepare(`
        SELECT id, title, slug, author, coverImageId, avg_rating, review_count
        FROM books 
        WHERE published = 1 AND coverImageId IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 12
    `).all();

    return {
        user,
        books: results
    };
}
