// scripts/check-translations.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Go up one level to the project root, then to src/lib/translations.js
const translationsFile = path.join(__dirname, '..', 'src/lib/translations.js');

if (fs.existsSync(translationsFile)) {
  try {
    const content = fs.readFileSync(translationsFile, 'utf8');
    console.log('=== Translations File Content ===');
    console.log(content);
    
    // Check for the review count translation
    const reviewCountPattern = /reseña.*plural/;
    if (reviewCountPattern.test(content)) {
      console.log('\n=== Found review count translation ===');
      const match = content.match(/({[^}]*reseña[^}]*plural[^}]*})/);
      if (match) {
        console.log('Translation pattern:', match[0]);
      }
    }
  } catch (error) {
    console.error(`Error reading translations file:`, error);
  }
} else {
  console.log(`Translations file not found: ${translationsFile}`);
}
