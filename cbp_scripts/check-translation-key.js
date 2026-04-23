// cbp_scripts/check-translation-key.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Path to translations file
const translationsFile = path.join(projectRoot, 'src/lib/translations.js');

if (fs.existsSync(translationsFile)) {
  try {
    const content = fs.readFileSync(translationsFile, 'utf8');
    console.log('=== Looking for reviewCount translation key ===');
    
    // Look for the specific key
    const reviewCountPattern = /reviewCount[^}]*}/;
    if (reviewCountPattern.test(content)) {
      console.log('Found reviewCount translation:');
      const matches = content.match(reviewCountPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
    } else {
      console.log('reviewCount translation key not found in translations file');
    }
    
    // Look for any keys containing "review"
    console.log('\n=== All translation keys containing "review" ===');
    const reviewPattern = /["']([^"']*review[^"']*)["']\s*:/g;
    let match;
    while ((match = reviewPattern.exec(content)) !== null) {
      console.log(`  - ${match[1]}`);
    }
    
  } catch (error) {
    console.error(`Error reading translations file:`, error);
  }
} else {
  console.log(`Translations file not found: ${translationsFile}`);
}
