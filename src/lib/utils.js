// src/lib/utils.js

/**
 * Generate a cryptographically secure, unguessable session token.
 * Uses Web Crypto API (available in Cloudflare Workers and browsers).
 * @returns {string} Random UUID v4 string
 */
export function generateSessionToken() {
    // Fallback for environments without crypto (shouldn't happen in CF)
    if (typeof crypto === 'undefined' || !crypto.randomUUID) {
        throw new Error('crypto.randomUUID is not available');
    }
    return crypto.randomUUID();
}

/**
 * Slugify while preserving diacritics (á, é, ñ, etc.)
 * @param {string} str - The input string to slugify
 * @returns {string} The slugified string with diacritics preserved
 */
export function slugifyDiacritics(str) {
    return str
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/[-\s]+/g, '-');
}
