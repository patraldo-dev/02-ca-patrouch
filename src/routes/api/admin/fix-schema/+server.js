// src/routes/api/admin/fix-schema/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        // Check current schema
        const schema = await platform.env.DB_book.prepare("PRAGMA table_info(books);").all();
        
        // Check if the table exists
        const tableExists = await platform.env.DB_book.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books';").all();
        
        if (tableExists.results.length === 0) {
            // Create the table with proper schema
            await platform.env.DB_book.exec(`
                CREATE TABLE books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    description TEXT,
                    published_year INTEGER,
                    slug TEXT NOT NULL UNIQUE,
                    published INTEGER DEFAULT 0,
                    coverImageId TEXT
                )
            `);
            
            return json({ 
                success: true, 
                message: 'Created books table with proper schema' 
            });
        }
        
        // Check if the schema needs fixing
        const columns = schema.results;
        const hasIdColumn = columns.some(col => col.name === 'id' && col.type === 'INTEGER');
        const hasSlugColumn = columns.some(col => col.name === 'slug');
        const hasPublishedColumn = columns.some(col => col.name === 'published');
        
        let changes = [];
        
        // Add missing columns if needed
        if (!hasSlugColumn) {
            await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN slug TEXT;");
            changes.push('Added slug column');
        }
        
        if (!hasPublishedColumn) {
            await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;");
            changes.push('Added published column');
        }
        
        // If the table exists but has issues, we might need to recreate it
        if (!hasIdColumn) {
            // Backup existing data
            const existingData = await platform.env.DB_book.prepare("SELECT * FROM books").all();
            
            // Drop and recreate table
            await platform.env.DB_book.exec("DROP TABLE books;");
            
            // Create with proper schema
            await platform.env.DB_book.exec(`
                CREATE TABLE books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    description TEXT,
                    published_year INTEGER,
                    slug TEXT NOT NULL UNIQUE,
                    published INTEGER DEFAULT 0,
                    coverImageId TEXT
                )
            `);
            
            // Restore data if any
            for (const book of existingData.results) {
                await platform.env.DB_book.prepare(`
                    INSERT INTO books (title, author, description, published_year, slug, published, coverImageId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    book.title,
                    book.author,
                    book.description,
                    book.published_year,
                    book.slug || createSlug(book.title),
                    book.published || 0,
                    book.coverImageId
                ).run();
            }
            
            changes.push('Fixed table schema');
        }
        
        return json({ 
            success: true, 
            message: changes.length > 0 ? `Schema fixed: ${changes.join(', ')}` : 'Schema is already correct',
            schema: schema.results
        });
    } catch (error) {
        console.error('Error fixing schema:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
    
    function createSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
