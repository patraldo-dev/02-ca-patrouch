// src/lib/auth-helpers.js

/**
 * Hash a password using Web Crypto API (PBKDF2).
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Format: "iterations:saltB64:hashB64"
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;

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
    const saltB64 = btoa(String.fromCharCode(...salt));

    return `${iterations}:${saltB64}:${hashB64}`;
}

/**
 * Verify a password against a stored hash.
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored hash from DB (format: "iterations:salt:hash")
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, storedHash) {
    try {
        if (!storedHash || typeof storedHash !== 'string') {
            return false;
        }

        const parts = storedHash.split(':');
        if (parts.length !== 3) {
            return false;
        }

        const [iterationsStr, saltB64, storedHashB64] = parts;
        const iterations = parseInt(iterationsStr, 10);

        // Validate Base64 before decoding
        if (!isValidBase64(saltB64) || !isValidBase64(storedHashB64)) {
            return false;
        }

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
    } catch (err) {
        console.error('Password verification failed:', err);
        return false;
    }
}

/**
 * Validate if a string is valid Base64
 * @param {string} str
 * @returns {boolean}
 */
function isValidBase64(str) {
    if (typeof str !== 'string') return false;
    const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
    return base64Regex.test(str.replace(/\s/g, ''));
}
