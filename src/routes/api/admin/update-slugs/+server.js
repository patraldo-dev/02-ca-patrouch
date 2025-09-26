// src/routes/api/admin/update-slugs/+server.js
import { json } from '@sveltejs/kit';

function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
}

export async function POST({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        // Get all books
        const booksResult = await platform.env.DB_book.prepare("SELECT * FROM books").all();
        const books = booksResult.results;
        
        // Update each book with a proper slug
        for (const book of books) {
            const slug = createSlug(book.title);
            await platform.env.DB_book.prepare("UPDATE books SET slug = ? WHERE id = ?")
                .bind(slug, book.id)
                .run();
        }
        
        return json({ 
            success: true, 
            message: `Updated slugs for ${books.length} books` 
        });
    } catch (error) {
        console.error('Error updating slugs:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
