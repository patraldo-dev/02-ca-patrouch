// src/routes/api/admin/migrate/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ platform }) {
  try {
    // Check if slug column exists
    const tableInfo = await platform.env.DB.prepare("PRAGMA table_info(books);").all();
    const hasSlugColumn = tableInfo.results.some(column => column.name === 'slug');
    
    if (!hasSlugColumn) {
      // Add slug column
      await platform.env.DB.exec("ALTER TABLE books ADD COLUMN slug TEXT;");
      
      // Update the one book record with a slug
      await platform.env.DB.exec("UPDATE books SET slug = 'the-only-book' WHERE id = 1;");
    }
    
    // Check if published column exists
    const hasPublishedColumn = tableInfo.results.some(column => column.name === 'published');
    
    if (!hasPublishedColumn) {
      // Add published column
      await platform.env.DB.exec("ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;");
      
      // Update the one book record to be published
      await platform.env.DB.exec("UPDATE books SET published = 1 WHERE id = 1;");
    }
    
    return json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
