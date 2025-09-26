// src/db/migrate.js
import { up as migration001 } from './migrations/001-add-slug-to-books.js';
import { up as migration002 } from './migrations/002-fix-books-table.js';

export async function migrate(db) {
    try {
        // Run migration 001 first (if needed)
        try {
            await migration001(db);
            console.log('Migration 001 completed successfully');
        } catch (error) {
            console.log('Migration 001 skipped or already applied:', error.message);
        }
        
        // Run migration 002
        await migration002(db);
        console.log('Migration 002 completed successfully');
        
        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
