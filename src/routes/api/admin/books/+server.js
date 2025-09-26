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
        // Parse the form data
        const formData = await request.formData();
        
        // Extract fields from form data
        const title = formData.get('title');
        const author = formData.get('author');
        const description = formData.get('description');
        const published_year = formData.get('published_year');
        const coverImage = formData.get('coverImage');
        
        // Validate required fields
        if (!title || !author) {
            return json({ error: 'Title and author are required' }, { status: 400 });
        }
        
        // Generate a slug from the title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Handle cover image upload if present
        let cover_image_url = null;
        let coverImageId = null;
        
        if (coverImage && coverImage.size > 0) {
            // In a real implementation, you would upload the image to a service like Cloudflare Images or AWS S3
            // For now, we'll just store the filename
            cover_image_url = coverImage.name;
            // If you're using Cloudflare Images, you would do something like:
            // const imageUpload = await uploadToCloudflareImages(coverImage);
            // coverImageId = imageUpload.id;
        }
        
        // Parse published_year as integer or null
        const publishedYear = published_year ? parseInt(published_year) : null;
        
        // Create a new book - note we don't provide the id, it will be auto-generated
        const result = await db.prepare(`
            INSERT INTO books (title, author, description, cover_image_url, coverImageId, slug, published_year, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            title,
            author,
            description || null,
            cover_image_url,
            coverImageId,
            slug,
            publishedYear,
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
        return json({ error: 'Failed to create book: ' + err.message }, { status: 500 });
    }
}
