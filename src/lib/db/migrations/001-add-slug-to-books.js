// src/db/migrations/001-add-slug-to-books.js
export async function up(db) {
    // Add the slug column
    await db.exec(`
        ALTER TABLE books ADD COLUMN slug TEXT
    `);
    
    // Generate slugs for existing books
    await db.exec(`
        UPDATE books 
        SET slug = lower(replace(replace(replace(title, ' ', '-'), '.', ''), '/', '-')) || '-' || hex(randomblob(4))
        WHERE slug IS NULL OR slug = ''
    `);
    
    // Make the column NOT NULL
    await db.exec(`
        ALTER TABLE books ALTER COLUMN slug TEXT NOT NULL
    `);
    
    // Add unique constraint
    await db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_books_slug ON books(slug)
    `);
}

export async function down(db) {
    // Remove the unique constraint
    await db.exec(`
        DROP INDEX IF EXISTS idx_books_slug
    `);
    
    // Remove the column
    await db.exec(`
        ALTER TABLE books DROP COLUMN slug
    `);
}
