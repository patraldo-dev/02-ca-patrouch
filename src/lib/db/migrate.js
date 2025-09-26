// src/lib/db/migrate.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './db.js'; // Adjust this import path as needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log('Running migrations...');
    
    for (const file of migrationFiles) {
      try {
        const migration = await import(path.join(migrationsDir, file));
        if (typeof migration.up === 'function') {
          console.log(`Running migration: ${file}`);
          await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
          console.log(`Migration ${file} completed`);
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
