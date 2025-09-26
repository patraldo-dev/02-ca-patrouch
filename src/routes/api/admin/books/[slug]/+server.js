// src/routes/api/admin/books/[id]/+server.js
import { json } from '@sveltejs/kit';

export async function PUT({ params, request, platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const { id } = params;
        const data = await request.json();
        
        // Update the book
        await platform.env.DB_book.prepare(`
            UPDATE books 
            SET title = ?, author = ?, published_year = ?, slug = ?, published = ?
            WHERE id = ?
        `).bind(
            data.title,
            data.author,
            data.published_year || null,
            data.slug,
            data.published ? 1 : 0,
            id
        ).run();
        
        return json({ success: true, message: 'Book updated successfully' });
    } catch (error) {
        console.error('Error updating book:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
