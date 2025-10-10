// cbp_scripts/debug-translation.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Check the home page Svelte component
const homePageFile = path.join(projectRoot, 'src/routes/+page.svelte');

if (fs.existsSync(homePageFile)) {
  try {
    const content = fs.readFileSync(homePageFile, 'utf8');
    console.log('=== Home Page Svelte Component ===');
    
    // Look for the specific translation call
    const reviewCountPattern = /\$t\([^)]*reviewCount[^)]*\)/;
    if (reviewCountPattern.test(content)) {
      console.log('Found reviewCount translation call:');
      const matches = content.match(reviewCountPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
      
      // Show the context around the match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (reviewCountPattern.test(line)) {
          console.log(`\nLine ${index + 1}: ${line.trim()}`);
          // Show a few lines before and after for context
          for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
            if (i !== index) {
              console.log(`Line ${i + 1}: ${lines[i].trim()}`);
            }
          }
        }
      });
    } else {
      console.log('No reviewCount translation call found');
    }
  } catch (error) {
    console.error(`Error reading home page file:`, error);
  }
} else {
  console.log(`Home page file not found: ${homePageFile}`);
}

// Check the current translation files
const languages = ['en', 'es', 'fr'];
console.log('\n=== Current Translation Files ===');

languages.forEach(lang => {
  const homeTranslationFile = path.join(projectRoot, 'src/lib/locales', lang, 'pages', 'home.json');
  
  if (fs.existsSync(homeTranslationFile)) {
    try {
      const content = fs.readFileSync(homeTranslationFile, 'utf8');
      const parsedContent = JSON.parse(content);
      
      console.log(`\n=== ${lang.toUpperCase()} Home Translations ===`);
      console.log(`reviewCount translation: "${parsedContent.featured.book.reviewCount}"`);
    } catch (error) {
      console.error(`Error reading ${lang} home translations:`, error);
    }
  } else {
    console.log(`${lang.toUpperCase()} home translation file not found: ${homeTranslationFile}`);
  }
});
