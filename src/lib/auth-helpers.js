// src/lib/auth-helpers.js

/**
 * Hash a password using Web Crypto API (PBKDF2).
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Base64-encoded hash
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000; // Adjust based on security/performance needs

    const key = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        key,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const hash = btoa(String.fromCharCode(...hashArray));
    const saltB64 = btoa(String.fromCharCode(...salt));

    return `${iterations}:${saltB64}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored hash from DB (format: "iterations:salt:hash")
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, storedHash) {
    const [iterationsStr, saltB64, storedHashB64] = storedHash.split(':');
    const iterations = parseInt(iterationsStr, 10);

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        key,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const hashB64 = btoa(String.fromCharCode(...hashArray));

    return hashB64 === storedHashB64;
}
