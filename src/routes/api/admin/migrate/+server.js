// src/routes/api/admin/migrate/+server.js
import { json } from '@sveltejs/kit';
import { migrate } from '$lib/db/migrate.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ platform }) {
    if (!platform?.env?.DB_book) {
        return json({ error: 'Database not available' }, { status: 500 });
    }
    
    const db = platform.env.DB_book;
    
    try {
        // Run the migrations
        await migrate(db);
        
        return json({ success: true, message: 'Migrations completed successfully' });
    } catch (error) {
        console.error('Migration failed:', error);
        return json({ error: 'Migration failed: ' + error.message }, { status: 500 });
    }
}
