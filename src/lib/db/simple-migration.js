// src/lib/db/simple-migration.js
import { sequelize } from './db.js';

export async function addSlugColumn() {
  try {
    // Check if the column already exists
    const [results] = await sequelize.query("PRAGMA table_info(books);");
    const hasSlugColumn = results.some(column => column.name === 'slug');
    
    if (!hasSlugColumn) {
      // Add the slug column
      await sequelize.query(`
        ALTER TABLE books ADD COLUMN slug TEXT;
      `);
      
      console.log('Added slug column to books table');
      
      // Update the one book record with a slug
      await sequelize.query(`
        UPDATE books SET slug = 'the-only-book' WHERE id = 1;
      `);
      
      console.log('Updated the book record with a slug');
      
      return { success: true, message: 'Migration completed successfully' };
    } else {
      console.log('Slug column already exists');
      return { success: true, message: 'Slug column already exists' };
    }
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
}

export async function addPublishedColumn() {
  try {
    // Check if the column already exists
    const [results] = await sequelize.query("PRAGMA table_info(books);");
    const hasPublishedColumn = results.some(column => column.name === 'published');
    
    if (!hasPublishedColumn) {
      // Add the published column
      await sequelize.query(`
        ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;
      `);
      
      console.log('Added published column to books table');
      
      // Update the one book record to be published
      await sequelize.query(`
        UPDATE books SET published = 1 WHERE id = 1;
      `);
      
      console.log('Updated the book record as published');
      
      return { success: true, message: 'Migration completed successfully' };
    } else {
      console.log('Published column already exists');
      return { success: true, message: 'Published column already exists' };
    }
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
}
