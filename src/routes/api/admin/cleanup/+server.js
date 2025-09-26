// src/routes/api/admin/cleanup/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        // Remove the auto-generated book
        const result = await platform.env.DB_book.prepare("DELETE FROM books WHERE title = 'Your Book Title' AND author = 'Author Name'").run();
        
        // Also check for any books with ID 'book-123'
        const result2 = await platform.env.DB_book.prepare("DELETE FROM books WHERE id = 'book-123'").run();
        
        return json({ 
            success: true, 
            message: `Removed ${result.changes + result2.changes} auto-generated books` 
        });
    } catch (error) {
        console.error('Error cleaning up books:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
