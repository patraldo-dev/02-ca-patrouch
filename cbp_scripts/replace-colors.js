// replace-colors.js
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory (parent of the scripts directory)
const projectRoot = path.join(__dirname, '..');

// Define color mappings
const colorMappings = {
  '#3b82f6': 'var(--primary-color)',
  '#2563eb': 'var(--primary-dark)',
  'blue': 'var(--primary-color)'
};

// Get all relevant files using absolute paths
const files = execSync('find src -name "*.svelte" -o -name "*.js" -o -name "*.ts" -o -name "*.css"', { 
  encoding: 'utf8',
  cwd: projectRoot  // Run find from the project root
})
  .split('\n')
  .filter(Boolean)
  .map(file => path.join(projectRoot, file));  // Convert to absolute paths

// Process each file
files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    const ext = path.extname(file);
    
    if (ext === '.css') {
      // Skip app.css since it contains the variable definitions
      if (file.endsWith(path.join(projectRoot, 'src/app.css'))) {
        return;
      }
      
      // CSS files - simple replacement
      Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
        const regex = new RegExp(oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          modified = true;
        }
      });
    } 
    else if (ext === '.svelte') {
      // Handle style tags - FIXED VERSION
      content = content.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (match, openTag, styles, closeTag) => {
        let styleModified = false;
        Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
          const regex = new RegExp(oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          if (regex.test(styles)) {
            styles = styles.replace(regex, newColor);
            styleModified = true;
          }
        });
        return styleModified ? `${openTag}${styles}${closeTag}` : match;
      });
      
      // Handle inline styles
      content = content.replace(/style="([^"]*)"/g, (match, styles) => {
        let styleModified = false;
        Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
          const regex = new RegExp(oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          if (regex.test(styles)) {
            styles = styles.replace(regex, newColor);
            styleModified = true;
          }
        });
        return styleModified ? `style="${styles}"` : match;
      });
      
      // Check if anything was modified
      const originalContent = fs.readFileSync(file, 'utf8');
      modified = content !== originalContent;
    }
    else if (ext === '.js' || ext === '.ts') {
      // Handle JavaScript/TypeScript files (like mailgun.js and email.js)
      Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
        const regex = new RegExp(oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          modified = true;
        }
      });
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});

// Handle SVG files separately
const svgFiles = execSync('find src -name "*.svg"', { 
  encoding: 'utf8',
  cwd: projectRoot  // Run find from the project root
})
  .split('\n')
  .filter(Boolean)
  .map(file => path.join(projectRoot, file));  // Convert to absolute paths

svgFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
      // Handle fill attributes
      const fillRegex = new RegExp(`fill="${oldColor}"`, 'g');
      if (fillRegex.test(content)) {
        content = content.replace(fillRegex, `fill="${newColor}"`);
        modified = true;
      }
      
      // Handle stroke attributes
      const strokeRegex = new RegExp(`stroke="${oldColor}"`, 'g');
      if (strokeRegex.test(content)) {
        content = content.replace(strokeRegex, `stroke="${newColor}"`);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});

console.log('Color replacement complete!');
