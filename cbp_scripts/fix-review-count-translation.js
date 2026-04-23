// cbp_scripts/fix-review-count-translation.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Update the translation files
const updateTranslationFile = (lang, updatedContent) => {
  const homeTranslationFile = path.join(projectRoot, 'src/lib/locales', lang, 'pages', 'home.json');
  
  if (fs.existsSync(homeTranslationFile)) {
    try {
      fs.writeFileSync(homeTranslationFile, JSON.stringify(updatedContent, null, 2));
      console.log(`Updated ${lang.toUpperCase()} home translation file`);
    } catch (error) {
      console.error(`Error updating ${lang} home translations:`, error);
    }
  } else {
    console.log(`${lang.toUpperCase()} home translation file not found: ${homeTranslationFile}`);
  }
};

// English translation update
const enContent = {
  "title": "Ex Libris — Honest book reviews",
  "hero": {
    "heading": "Discover Your Next Favorite Book",
    "subtitle": "Honest book reviews and thoughtful commentary",
    "exploreBooks": "Explore Books",
    "learnMore": "Learn More"
  },
  "featured": {
    "heading": "Featured Books",
    "empty": "No books available yet. Check back soon!",
    "book": {
      "by": "by",
      "coverAlt": "Cover of {title}",
      "readMore": "Read Review",
      "reviewCount": "({count} review{count, plural, one{} other{s}})"
    }
  },
  "colorReference": {
    "heading": "Color Reference",
    "subtitle": "Our brand color palette"
  },
  "colorGuide": {
    "title": "Brand Colors",
    "colors": {
      "primary": {
        "name": "Primary Tan",
        "shade": "Tan",
        "usage": "Main brand color, buttons, headers"
      },
      "primaryDark": {
        "name": "Dark Tan",
        "shade": "Darker Tan",
        "usage": "Hover states, emphasis"
      },
      "primaryLight": {
        "name": "Light Beige",
        "shade": "Beige",
        "usage": "Backgrounds, subtle elements"
      }
    }
  }
};

// Spanish translation update
const esContent = {
  "title": "Ex Libris — Reseñas honestas de libros",
  "hero": {
    "heading": "Descubre Tu Próximo Libro Favorito",
    "subtitle": "Reseñas honestas de libros y comentarios reflexivos",
    "exploreBooks": "Explorar Libros",
    "learnMore": "Conocer Más"
  },
  "featured": {
    "heading": "Libros Destacados",
    "empty": "Aún no hay libros disponibles. ¡Vuelve pronto!",
    "book": {
      "by": "por",
      "coverAlt": "Portada de {title}",
      "readMore": "Leer Reseña",
      "reviewCount": "({count} reseña{count, plural, one{} other{s}})"
    }
  },
  "colorReference": {
    "heading": "Referencia de Colores",
    "subtitle": "Nuestra paleta de colores de marca"
  },
  "colorGuide": {
    "title": "Colores de Marca",
    "colors": {
      "primary": {
        "name": "Canela Principal",
        "shade": "Canela",
        "usage": "Color principal de marca, botones, encabezados"
      },
      "primaryDark": {
        "name": "Canela Oscuro",
        "shade": "Canela Oscuro",
        "usage": "Estados hover, énfasis"
      },
      "primaryLight": {
        "name": "Beige Claro",
        "shade": "Beige",
        "usage": "Fondos, elementos sutiles"
      }
    }
  }
};

// French translation update
const frContent = {
  "title": "Ex Libris — Critiques honnêtes de livres",
  "hero": {
    "heading": "Découvrez Votre Prochain Livre Préféré",
    "subtitle": "Critiques honnêtes de livres et commentaires réfléchis",
    "exploreBooks": "Explorer les Livres",
    "learnMore": "En Savoir Plus"
  },
  "featured": {
    "heading": "Livres en Vedette",
    "empty": "Aucun livre disponible pour le moment. Revenez bientôt!",
    "book": {
      "by": "par",
      "coverAlt": "Couverture de {title}",
      "readMore": "Lire la Critique",
      "reviewCount": "({count} avis{count, plural, one{} other{s}})"
    }
  },
  "colorReference": {
    "heading": "Référence des Couleurs",
    "subtitle": "Notre palette de couleurs de marque"
  },
  "colorGuide": {
    "title": "Couleurs de Marca",
    "colors": {
      "primary": {
        "name": "Tan Principal",
        "shade": "Tan",
        "usage": "Couleur principale de la marque, boutons, en-têtes"
      },
      "primaryDark": {
        "name": "Tan Foncé",
        "shade": "Tan Foncé",
        "usage": "États de survol, emphase"
      },
      "primaryLight": {
        "name": "Beige Clair",
        "shade": "Beige",
        "usage": "Arrière-plans, éléments subtils"
      }
    }
  }
};

// Update all translation files
updateTranslationFile('en', enContent);
updateTranslationFile('es', esContent);
updateTranslationFile('fr', frContent);

// Now update the Svelte component to remove the manual plural parameter
const homePageFile = path.join(projectRoot, 'src/routes/+page.svelte');

if (fs.existsSync(homePageFile)) {
  try {
    let content = fs.readFileSync(homePageFile, 'utf8');
    
    // Replace the translation call to remove the manual plural parameter
    const oldPattern = /\$t\('pages\.home\.featured\.book\.reviewCount', \{\s*count: book\.review_count,\s*plural: book\.review_count === 1 \? '' : 's'\s*\}\)/g;
    const newPattern = "$t('pages.home.featured.book.reviewCount', { count: book.review_count })";
    
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(homePageFile, content);
      console.log('Updated home page Svelte component');
    } else {
      console.log('Could not find the translation call pattern in the home page');
    }
  } catch (error) {
    console.error(`Error updating home page Svelte component:`, error);
  }
} else {
  console.log(`Home page file not found: ${homePageFile}`);
}

console.log('\nReview count translation fix complete!');
