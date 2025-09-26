// src/routes/api/admin/books/[slug]/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ params, platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const { slug } = params;
        
        // Get book by slug
        const result = await platform.env.DB_book.prepare("SELECT * FROM books WHERE slug = ?").bind(slug).first();
        
        if (!result) {
            return json({ 
                success: false, 
                error: 'Book not found' 
            }, { status: 404 });
        }
        
        return json(result);
    } catch (error) {
        console.error('Error fetching book:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

export async function PUT({ params, request, platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const { slug } = params;
        const data = await request.json();
        
        // Update the book by slug
        await platform.env.DB_book.prepare(`
            UPDATE books 
            SET title = ?, author = ?, published_year = ?, slug = ?, published = ?, coverImageId = ?
            WHERE slug = ?
        `).bind(
            data.title,
            data.author,
            data.published_year || null,
            data.slug,
            data.published ? 1 : 0,
            data.coverImageId || null,
            slug
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

export async function DELETE({ params, platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const { slug } = params;
        
        // Delete the book by slug
        const result = await platform.env.DB_book.prepare("DELETE FROM books WHERE slug = ?").bind(slug).run();
        
        if (result.changes === 0) {
            return json({ 
                success: false, 
                error: 'Book not found' 
            }, { status: 404 });
        }
        
        return json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
