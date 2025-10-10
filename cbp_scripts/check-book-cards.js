// cbp_scripts/check-book-cards.js
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Find all Svelte files
const svelteFiles = execSync('find src -name "*.svelte"', { 
  encoding: 'utf8',
  cwd: projectRoot
})
  .split('\n')
  .filter(Boolean)
  .map(file => path.join(projectRoot, file));

console.log(`Found ${svelteFiles.length} Svelte files to check\n`);

// Process each Svelte file
svelteFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Look for the specific raw translation key pattern
    const rawKeyPattern = /{[^}]*review[^}]*}/;
    if (rawKeyPattern.test(content)) {
      console.log(`=== Found raw translation key in ${file} ===`);
      const matches = content.match(rawKeyPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
      
      // Show some context around the match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (rawKeyPattern.test(line)) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
      console.log('');
    }
    
    // Also check for any other potential raw translation keys
    const generalRawKeyPattern = /{[^}]*plural[^}]*}/;
    if (generalRawKeyPattern.test(content)) {
      console.log(`=== Found potential raw translation key with plural in ${file} ===`);
      const matches = content.match(generalRawKeyPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
      
      // Show some context around the match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (generalRawKeyPattern.test(line)) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
      console.log('');
    }
    
    // Check for any $t function calls that might be incorrectly formatted
    const tFunctionPattern = /\$t\([^)]*\{[^}]*plural[^}]*\}[^)]*\)/g;
    if (tFunctionPattern.test(content)) {
      console.log(`=== Found $t function with plural in ${file} ===`);
      const matches = content.match(tFunctionPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
      console.log('');
    }
    
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});

console.log('Check complete!');
