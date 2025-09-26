// src/db/migrations/002-fix-books-table.js
export async function up(db) {
    // Check if the table exists and what columns it has
    const tableInfo = await db.prepare("PRAGMA table_info(books)").all();
    
    // If the table doesn't exist, create it with correct schema
    if (tableInfo.length === 0) {
        await db.exec(`
            CREATE TABLE books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                isbn TEXT,
                cover_image_url TEXT,
                description TEXT,
                published_year INTEGER,
                slug TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        return;
    }
    
    // Check if id column is autoincrement
    const idColumn = tableInfo.find(col => col.name === 'id');
    if (idColumn && !idColumn.dflt_value) {
        // Table exists but id is not autoincrement, we need to recreate it
        await db.exec(`
            ALTER TABLE books RENAME TO books_old
        `);
        
        // Create new table with correct schema
        await db.exec(`
            CREATE TABLE books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                isbn TEXT,
                cover_image_url TEXT,
                description TEXT,
                published_year INTEGER,
                slug TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Copy data from old table
        await db.exec(`
            INSERT INTO books (title, author, isbn, cover_image_url, description, published_year, created_at)
            SELECT title, author, isbn, cover_image_url, description, published_year, created_at
            FROM books_old
        `);
        
        // Drop old table
        await db.exec(`
            DROP TABLE books_old
        `);
        
        // Add unique index for slug
        await db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_books_slug ON books(slug)
        `);
    } else {
        // Table exists and id is autoincrement, just add slug column if missing
        const slugColumn = tableInfo.find(col => col.name === 'slug');
        if (!slugColumn) {
            await db.exec(`
                ALTER TABLE books ADD COLUMN slug TEXT
            `);
            
            // Generate slugs for existing books
            await db.exec(`
                UPDATE books 
                SET slug = lower(replace(replace(replace(title, ' ', '-'), '.', ''), '/', '-')) || '-' || hex(randomblob(4))
                WHERE slug IS NULL OR slug = ''
            `);
            
            // Make slug NOT NULL
            await db.exec(`
                ALTER TABLE books ALTER COLUMN slug TEXT NOT NULL
            `);
            
            // Add unique constraint
            await db.exec(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_books_slug ON books(slug)
            `);
        }
    }
}

export async function down(db) {
    // This migration is not easily reversible, so we'll just ensure the table exists
    const tableInfo = await db.prepare("PRAGMA table_info(books)").all();
    if (tableInfo.length === 0) {
        await db.exec(`
            CREATE TABLE books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                isbn TEXT,
                cover_image_url TEXT,
                description TEXT,
                published_year INTEGER,
                slug TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
}
