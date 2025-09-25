// src/routes/api/books/[slug]/+server.js
import { json, error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform }) {
    const { slug } = params;
    
    if (!slug) {
        throw error(400, 'Book slug is required');
    }
    
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    
    const book = await db.prepare(`
        SELECT id, title, author, description, cover_url, slug
        FROM books
        WHERE slug = ?
    `).bind(slug).first();
    
    if (!book) {
        throw error(404, 'Book not found');
    }
    
    return json(book);
}
