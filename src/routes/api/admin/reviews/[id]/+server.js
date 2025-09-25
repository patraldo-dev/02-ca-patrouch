// src/routes/api/admin/reviews/[id]/+server.js
import { json, error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, platform }) {
    const { id } = params;
    
    if (!id) {
        return json({ error: 'Review ID is required' }, { status: 400 });
    }
    
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        const result = await db.prepare(`
            DELETE FROM reviews WHERE id = ?
        `).bind(id).run();
        
        if (result.changes === 0) {
            return json({ error: 'Review not found' }, { status: 404 });
        }
        
        return json({ success: true });
    } catch (err) {
        console.error('Error deleting review:', err);
        return json({ error: 'Failed to delete review' }, { status: 500 });
    }
}
