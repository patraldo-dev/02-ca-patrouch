// src/lib/server/password.js
/**
 * Pure Web Crypto password hashing — no native modules, works in Cloudflare Workers
 * Uses PBKDF2 with SHA-256 (secure, standard, widely supported)
 */

const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

/**
 * Hashes a password with a random salt
 * @param {string} password
 * @returns {Promise<{ hash: string, salt: string }>}
 */
export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: salt,
            iterations: ITERATIONS
        },
        passwordKey,
        KEY_LENGTH * 8
    );
    const hash = bufferToHex(hashBuffer);
    const saltHex = bufferToHex(salt);
    return { hash, salt: saltHex };
}

/**
 * Verifies a password against a hash + salt
 * @param {string} password
 * @param {string} hash
 * @param {string} salt
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const saltBuffer = hexToBuffer(salt);
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: saltBuffer,
            iterations: ITERATIONS
        },
        passwordKey,
        KEY_LENGTH * 8
    );
    const computedHash = bufferToHex(hashBuffer);
    return timingSafeEqual(computedHash, hash);
}

// Utils
function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

// Timing-safe string comparison (prevents timing attacks)
function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}
