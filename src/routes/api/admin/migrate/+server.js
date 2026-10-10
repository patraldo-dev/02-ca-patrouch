// src/routes/api/admin/migrate/+server.js
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

export async function POST({ platform }) {
  try {
    // Check if platform and DB_book are available
    if (!env?.DB_book) {
      return json({ 
        success: false, 
        error: 'Database not available. Check your D1 binding configuration.' 
      }, { status: 500 });
    }
    
    // Check if slug column exists
    const tableInfo = await env.DB_book.prepare("PRAGMA table_info(books);").all();
    const hasSlugColumn = tableInfo.results.some(column => column.name === 'slug');
    
    if (!hasSlugColumn) {
      // Add slug column
      await env.DB_book.exec("ALTER TABLE books ADD COLUMN slug TEXT;");
      
      // Update the one book record with a slug
      await env.DB_book.exec("UPDATE books SET slug = 'the-only-book' WHERE id = 1;");
    }
    
    // Check if published column exists
    const hasPublishedColumn = tableInfo.results.some(column => column.name === 'published');
    
    if (!hasPublishedColumn) {
      // Add published column
      await env.DB_book.exec("ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;");
      
      // Update the one book record to be published
      await env.DB_book.exec("UPDATE books SET published = 1 WHERE id = 1;");
    }
    
    return json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
