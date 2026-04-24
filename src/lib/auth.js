// src/lib/auth.js — Better Auth + Drizzle adapter for SvelteKit + Cloudflare D1
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { authSchema } from '../db/auth-schema.js';

// Custom scrypt hash/verify to avoid CPU limit on CF Workers free plan
// Better Auth's default @noble/hashes scrypt is too CPU-intensive for Workers
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N — lower than default 262144 but still secure
const SCRYPT_BLOCK = 8;
const SCRYPT_PARALLEL = 1;

async function hashPassword(password) {
    const { scrypt } = await import('node:crypto');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return new Promise((resolve, reject) => {
        scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST, r: SCRYPT_BLOCK, p: SCRYPT_PARALLEL }, (err, derivedKey) => {
            if (err) return reject(err);
            const buf = Buffer.alloc(salt.length + derivedKey.length);
            salt.copy(buf, 0);
            derivedKey.copy(buf, salt.length);
            resolve(`scrypt:${SCRYPT_COST}:${SCRYPT_BLOCK}:${SCRYPT_PARALLEL}:${buf.toString('base64')}`);
        });
    });
}

async function verifyPassword(hash, password) {
    const { scrypt } = await import('node:crypto');
    try {
        const [prefix, N, r, p, data] = hash.split(':');
        if (prefix !== 'scrypt') throw new Error('Unsupported hash format');
        const buf = Buffer.from(data, 'base64');
        const salt = buf.subarray(0, 16);
        const key = buf.subarray(16);
        return new Promise((resolve) => {
            scrypt(password, salt, key.length, { N: parseInt(N), r: parseInt(r), p: parseInt(p) }, (err, derivedKey) => {
                if (err) return resolve(false);
                resolve(derivedKey.equals(key));
            });
        });
    } catch {
        // Fallback for old PBKDF2 hashes
        const parts = hash.split(':');
        if (parts.length === 3 && parseInt(parts[0]) > 10000) {
            // Old PBKDF2 format: iterations:saltB64:hashB64
            const { pbkdf2 } = await import('node:crypto');
            const [iterations, saltB64, hashB64] = parts;
            const salt = Buffer.from(saltB64, 'base64');
            const expected = Buffer.from(hashB64, 'base64');
            const derived = pbkdf2Sync ? 
                pbkdf2Sync(password, salt, parseInt(iterations), expected.length, 'sha256') :
                null;
            if (derived) return derived.equals(expected);
        }
        return false;
    }
}

/**
 * Create a Better Auth instance per-request using D1 binding from env.
 * D1 bindings are only available at request time, so we can't use a singleton.
 */
export function createAuth(env) {
  const db = drizzle(env.DB_book);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET || '',
    baseURL: 'https://patrouch.ca',
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || '',
        clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID || '',
        clientSecret: env.GITHUB_CLIENT_SECRET || '',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    trustedOrigins: [
      'https://patrouch.ca',
      'https://*.chef-tech.workers.dev',
      'http://localhost:5173',
    ],
  });
}
