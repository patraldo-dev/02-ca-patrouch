// cbp_scripts/check-home-translations.js
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

console.log('=== Home Page Translation Files ===\n');

languages.forEach(lang => {
  const homeTranslationFile = path.join(projectRoot, 'src/lib/locales', lang, 'pages', 'home.json');
  
  if (fs.existsSync(homeTranslationFile)) {
    try {
      const content = fs.readFileSync(homeTranslationFile, 'utf8');
      console.log(`=== ${lang.toUpperCase()} Home Translations ===`);
      console.log(content);
      console.log('');
    } catch (error) {
      console.error(`Error reading ${lang} home translations:`, error);
    }
  } else {
    console.log(`${lang.toUpperCase()} home translation file not found: ${homeTranslationFile}`);
  }
});
