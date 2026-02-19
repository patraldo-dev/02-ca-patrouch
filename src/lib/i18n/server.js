// src/lib/i18n/server.js
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const locales = { en, es, fr };

export function getTranslation(locale = 'es') {
  const translation = locales[locale] || locales.es;
  
  return function(key) {
    // Try exact match
    let result = translation[key];
    
    // If not found, try lowercase version (for consistency)
    if (!result) {
      result = translation[key.toLowerCase()];
    }
    
    // Fallback to Spanish if still not found
    if (!result && locale !== 'es') {
      result = locales.es[key] || locales.es[key.toLowerCase()];
    }
    
    // If still not found, return the key itself
    return result || key;
  };
}
