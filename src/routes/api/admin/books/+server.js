// src/routes/api/admin/books/+server.js
import { json, error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        // Fetch all books
        const { results } = await db.prepare(`
            SELECT id, title, author, description, cover_image_url, coverImageId, slug, published_year, created_at
            FROM books
            ORDER BY title ASC
        `).all();
        
        return json(results);
    } catch (err) {
        console.error('Error fetching books:', err);
        return json({ error: 'Failed to fetch books' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        const { title, author, description, cover_image_url, coverImageId, published_year } = await request.json();
        
        if (!title || !author) {
            return json({ error: 'Title and author are required' }, { status: 400 });
        }
        
        // Generate a slug from the title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Create a new book
        const result = await db.prepare(`
            INSERT INTO books (title, author, description, cover_image_url, coverImageId, slug, published_year, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            title,
            author,
            description || null,
            cover_image_url || null,
            coverImageId || null,
            slug,
            published_year || null,
            new Date().toISOString()
        ).run();
        
        if (!result.success) {
            return json({ error: 'Failed to create book' }, { status: 500 });
        }
        
        // Return the newly created book
        const newBook = await db.prepare(`
            SELECT id, title, author, description, cover_image_url, coverImageId, slug, published_year
            FROM books
            WHERE id = ?
        `).bind(result.lastInsertRowid).first();
        
        return json(newBook, { status: 201 });
    } catch (err) {
        console.error('Error creating book:', err);
        return json({ error: 'Failed to create book' }, { status: 500 });
    }
}
