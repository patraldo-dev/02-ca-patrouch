// src/routes/api/test-book/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        // Get the first book to check its structure
        const result = await platform.env.DB_book.prepare("SELECT * FROM books LIMIT 1").first();
        
        return json({ 
            success: true, 
            book: result 
        });
    } catch (error) {
        console.error('Error testing book:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
