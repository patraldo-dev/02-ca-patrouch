// src/routes/api/debug/books/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        // Get all books
        const books = await platform.env.DB_book.prepare("SELECT * FROM books").all();
        
        // Get table schema
        const schema = await platform.env.DB_book.prepare("PRAGMA table_info(books);").all();
        
        return json({
            success: true,
            books: books.results,
            schema: schema.results,
            count: books.results.length
        });
    } catch (error) {
        console.error('Debug error:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
