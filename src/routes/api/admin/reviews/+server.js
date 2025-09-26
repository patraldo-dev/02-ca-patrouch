// src/routes/api/admin/reviews/+server.js
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

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        const { content, rating, book_id } = await request.json();
        
        if (!content || !rating || !book_id) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Create a new review
        const result = await db.prepare(`
            INSERT INTO reviews (content, rating, book_id, user_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            content,
            rating,
            book_id,
            'user-id-placeholder', // This should be the actual user ID from the session
            new Date().toISOString()
        ).run();
        
        if (!result.success) {
            return json({ error: 'Failed to create review' }, { status: 500 });
        }
        
        // Return the newly created review
        const newReview = await db.prepare(`
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
            WHERE r.id = ?
        `).bind(result.lastInsertRowid).first();
        
        return json(newReview, { status: 201 });
    } catch (err) {
        console.error('Error creating review:', err);
        return json({ error: 'Failed to create review' }, { status: 500 });
    }
}
