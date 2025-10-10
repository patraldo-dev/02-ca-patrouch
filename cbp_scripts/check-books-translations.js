// cbp_scripts/check-books-translations.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Languages to check
const languages = ['en', 'es', 'fr'];

console.log('=== Books Page Translation Files ===\n');

languages.forEach(lang => {
  const booksTranslationFile = path.join(projectRoot, 'src/lib/locales', lang, 'pages', 'books.json');
  
  if (fs.existsSync(booksTranslationFile)) {
    try {
      const content = fs.readFileSync(booksTranslationFile, 'utf8');
      console.log(`=== ${lang.toUpperCase()} Books Translations ===`);
      console.log(content);
      console.log('');
    } catch (error) {
      console.error(`Error reading ${lang} books translations:`, error);
    }
  } else {
    console.log(`${lang.toUpperCase()} books translation file not found: ${booksTranslationFile}`);
  }
});

// Also check the books page Svelte component to see how the rating is displayed
const booksPageFile = path.join(projectRoot, 'src/routes/books/+page.svelte');

if (fs.existsSync(booksPageFile)) {
  try {
    const content = fs.readFileSync(booksPageFile, 'utf8');
    console.log('=== Books Page Svelte Component ===');
    
    // Look for the rating translation call
    const ratingPattern = /\$t\('pages\.books\.book\.rating'[^)]*\)/;
    if (ratingPattern.test(content)) {
      console.log('Found rating translation call:');
      const matches = content.match(ratingPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
      
      // Show the context around the match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (ratingPattern.test(line)) {
          console.log(`\nLine ${index + 1}: ${line.trim()}`);
          // Show a few lines before and after for context
          for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
            if (i !== index) {
              console.log(`Line ${i + 1}: ${lines[i].trim()}`);
            }
          }
        }
      });
    }
    
    // Also look for any raw rating text
    const rawRatingPattern = /\(\{count\} reviews\)/;
    if (rawRatingPattern.test(content)) {
      console.log('\nFound raw rating text:');
      const matches = content.match(rawRatingPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
    }
  } catch (error) {
    console.error(`Error reading books page file:`, error);
  }
} else {
  console.log(`Books page file not found: ${booksPageFile}`);
}
