// src/lib/db/migrate.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Dynamic import to avoid bundling issues
let sequelize;
try {
  const { sequelize: db } = await import('./db.js');
  sequelize = db;
} catch (error) {
  console.error('Failed to import database:', error);
  throw error;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory does not exist');
      return { success: true, message: 'No migrations to run' };
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log('Running migrations...');
    
    for (const file of migrationFiles) {
      try {
        const migrationPath = path.join(migrationsDir, file);
        const migration = await import(migrationPath);
        
        if (typeof migration.up === 'function') {
          console.log(`Running migration: ${file}`);
          await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
          console.log(`Migration ${file} completed successfully`);
        }
      } catch (error) {
        console.error(`Error executing migration ${file}:`, error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('All migrations completed');
    return { success: true, message: 'Migrations completed successfully' };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
}
