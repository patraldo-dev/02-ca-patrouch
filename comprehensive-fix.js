// cbp_scripts/comprehensive-fix.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Update the home page Svelte component
const homePageFile = path.join(projectRoot, 'src/routes/+page.svelte');

if (fs.existsSync(homePageFile)) {
  try {
    let content = fs.readFileSync(homePageFile, 'utf8');
    
    // Show the current state of the file around the rating element
    console.log('=== Current home page content around rating element ===');
    const lines = content.split('\n');
    for (let i = 70; i <= 85 && i < lines.length; i++) {
      console.log(`Line ${i + 1}: ${lines[i]}`);
    }
    
    // Try to find the book variable in the file
    const bookVariablePattern = /{#each\s+books\s+as\s+book}/g;
    if (bookVariablePattern.test(content)) {
      console.log('\nFound book variable in #each loop');
    }
    
    // Try to find the rating element
    const ratingPattern = /<div class="rating[^>]*>/g;
    if (ratingPattern.test(content)) {
      console.log('\nFound rating element(s):');
      const matches = content.match(ratingPattern);
      if (matches) {
        matches.forEach(match => console.log(`  - ${match}`));
      }
    }
    
    // Now try to fix it by replacing the entire problematic section
    const problematicSectionPattern = /<div class="rating[^>]*>⭐ \{rating\} \(\{count\} reviews\)<\/div>/g;
    if (problematicSectionPattern.test(content)) {
      const newSection = `<div class="rating svelte-i9sorx">⭐ {book.rating} ({book.review_count} {book.review_count === 1 ? 'review' : 'reviews'})</div>`;
      content = content.replace(problematicSectionPattern, newSection);
      fs.writeFileSync(homePageFile, content);
      console.log('\nUpdated the problematic section');
    } else {
      console.log('\nCould not find the exact problematic section');
      
      // Let's try to find any section with "reviews" text
      const reviewsTextPattern = /\(\{count\} reviews\)/g;
      if (reviewsTextPattern.test(content)) {
        console.log('\nFound "({count} reviews)" text:');
        const matches = content.match(reviewsTextPattern);
        if (matches) {
          matches.forEach(match => console.log(`  - ${match}`));
          
          // Replace all instances
          const newReviewsText = `({book.review_count} {book.review_count === 1 ? 'review' : 'reviews'})`;
          content = content.replace(reviewsTextPattern, newReviewsText);
          fs.writeFileSync(homePageFile, content);
          console.log('\nReplaced all instances of "({count} reviews)"');
        }
      }
    }
  } catch (error) {
    console.error(`Error updating home page Svelte component:`, error);
  }
} else {
  console.log(`Home page file not found: ${homePageFile}`);
}

console.log('\nComprehensive fix complete!');
