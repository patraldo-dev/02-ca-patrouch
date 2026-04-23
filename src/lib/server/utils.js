// src/lib/server/utils.js
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

/**
 * Generates a cryptographically secure random ID
 * @param {number} length - Length in bytes (default: 25 → 40 chars in base32)
 * @returns {string}
 */
export function generateId(length = 25) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
}
