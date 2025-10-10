// cbp_scripts/show-translations.js
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
    console.log('=== Translations File Content ===');
    console.log(content);
  } catch (error) {
    console.error(`Error reading translations file:`, error);
  }
} else {
  console.log(`Translations file not found: ${translationsFile}`);
}
