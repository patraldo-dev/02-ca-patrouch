// cbp_scripts/fix-books-rating.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory
const projectRoot = path.join(__dirname, '..');

// Update the translation files to use separate keys for singular and plural
const updateTranslationFile = (lang, updatedContent) => {
  const booksTranslationFile = path.join(projectRoot, 'src/lib/locales', lang, 'pages', 'books.json');
  
  if (fs.existsSync(booksTranslationFile)) {
    try {
      fs.writeFileSync(booksTranslationFile, JSON.stringify(updatedContent, null, 2));
      console.log(`Updated ${lang.toUpperCase()} books translation file`);
    } catch (error) {
      console.error(`Error updating ${lang} books translations:`, error);
    }
  } else {
    console.log(`${lang.toUpperCase()} books translation file not found: ${booksTranslationFile}`);
  }
};

// English translation update - separate singular and plural
const enContent = {
  "title": "All Books — Ex Libris",
  "heading": "📚 My Books",
  "loading": "Loading books...",
  "error": "Failed to load books",
  "networkError": "Network error. Please try again.",
  "empty": {
    "message": "No books found. Check back later for new additions!",
    "backToHome": "← Back to Home"
  },
  "book": {
    "coverAlt": "Cover of {title}",
    "by": "by",
    "ratingSingular": "⭐ {rating} ({count} review)",
    "ratingPlural": "⭐ {rating} ({count} reviews)",
    "readReviews": "Read Reviews"
  },
  "retry": "Try Again"
};

// Spanish translation update - separate singular and plural
const esContent = {
  "title": "Todos los libros — Ex Libris",
  "heading": "📚 Mis libros",
  "loading": "Cargando libros...",
  "error": "Error al cargar los libros",
  "networkError": "Error de red. Por favor, inténtalo de nuevo.",
  "empty": {
    "message": "No se encontraron libros. ¡Vuelve más tarde para ver nuevas adiciones!",
    "backToHome": "← Volver al inicio"
  },
  "book": {
    "coverAlt": "Portada de {title}",
    "by": "por",
    "ratingSingular": "⭐ {rating} ({count} reseña)",
    "ratingPlural": "⭐ {rating} ({count} reseñas)",
    "readReviews": "Leer reseñas"
  },
  "retry": "Reintentar"
};

// French translation update - separate singular and plural
const frContent = {
  "title": "Tous les livres — Ex Libris",
  "heading": "📚 Mes livres",
  "loading": "Chargement des livres...",
  "error": "Échec du chargement des livres",
  "networkError": "Erreur réseau. Veuillez réessayer.",
  "empty": {
    "message": "Aucun livre trouvé. Revenez plus tard pour de nouvelles additions !",
    "backToHome": "← Retour à l'accueil"
  },
  "book": {
    "coverAlt": "Couverture de {title}",
    "by": "par",
    "ratingSingular": "⭐ {rating} ({count} avis)",
    "ratingPlural": "⭐ {rating} ({count} avis)",
    "readReviews": "Lire les avis"
  },
  "retry": "Réessayer"
};

// Update all translation files
updateTranslationFile('en', enContent);
updateTranslationFile('es', esContent);
updateTranslationFile('fr', frContent);

// Now update the books page Svelte component
const booksPageFile = path.join(projectRoot, 'src/routes/books/+page.svelte');

if (fs.existsSync(booksPageFile)) {
  try {
    let content = fs.readFileSync(booksPageFile, 'utf8');
    
    // Find the rating translation call and update it
    const oldRatingPattern = /\$t\('pages\.books\.book\.rating',\s*\{\s*rating: parseFloat\(book\.avg_rating\)([^}]*)\}\)/g;
    const newRatingCall = `$t('pages.books.book.rating' + (book.review_count === 1 ? 'Singular' : 'Plural'), { 
      rating: parseFloat(book.avg_rating), 
      count: book.review_count 
    })`;
    
    if (oldRatingPattern.test(content)) {
      content = content.replace(oldRatingPattern, newRatingCall);
      fs.writeFileSync(booksPageFile, content);
      console.log('Updated books page Svelte component');
    } else {
      console.log('Could not find the rating translation call pattern in the books page');
    }
  } catch (error) {
    console.error(`Error updating books page Svelte component:`, error);
  }
} else {
  console.log(`Books page file not found: ${booksPageFile}`);
}

console.log('\nBooks rating fix complete!');
