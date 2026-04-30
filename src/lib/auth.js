// src/lib/auth.js — Better Auth + Drizzle adapter for SvelteKit + Cloudflare D1
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { authSchema } from '../db/auth-schema.js';

// PBKDF2 via WebCrypto — doesn't count against CF Workers CPU time
// Format: pbkdf2:iterations:salt_base64:hash_base64
const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH = 32; // 256 bits

export async function hashPassword(password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial, HASH_LENGTH * 8
    );
    const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
    const saltB64 = btoa(String.fromCharCode(...salt));
    return `pbkdf2:${PBKDF2_ITERATIONS}:${saltB64}:${hashB64}`;
}

async function verifyPassword(hash, password) {
    try {
        const parts = hash.split(':');
        if (parts[0] === 'pbkdf2') {
            const [_, iterations, saltB64, hashB64] = parts;
            const enc = new TextEncoder();
            const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
            const expected = Uint8Array.from(atob(hashB64), c => c.charCodeAt(0));
            const keyMaterial = await crypto.subtle.importKey(
                'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
            );
            const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt, iterations: parseInt(iterations), hash: 'SHA-256' },
                keyMaterial, expected.length * 8
            );
            const derived = new Uint8Array(bits);
            return derived.length === expected.length && derived.every((b, i) => b === expected[i]);
        }
        // Legacy scrypt support (read-only, for migration)
        if (parts[0] === 'scrypt') {
            const [_, N, r, p, data] = parts;
            const buf = Uint8Array.from(atob(data), c => c.charCodeAt(0));
            const salt = buf.slice(0, 16);
            const expectedKey = buf.slice(16);
            const { scrypt } = await import('node:crypto');
            const derived = await new Promise((resolve) => {
                scrypt(password, salt, expectedKey.length, { N: parseInt(N), r: parseInt(r), p: parseInt(p) }, (err, key) => {
                    if (err) return resolve(null);
                    resolve(key);
                });
            });
            if (!derived) return false;
            return derived.length === expectedKey.length && derived.every((b, i) => b === expectedKey[i]);
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Create a Better Auth instance per-request using D1 binding from env.
 */
export function createAuth(env) {
  const db = drizzle(env.DB_book);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET || '',
    baseURL: 'https://patrouch.ca',
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip']
      }
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      sendResetPassword: async ({ user, token, url }, request) => {
        const { sendMailgunEmail } = await import('$lib/server/mailgun.js');
        const acceptLang = request?.headers?.get('accept-language') || '';
        const lang = acceptLang.startsWith('fr') ? 'fr' : acceptLang.startsWith('en') ? 'en' : 'es';

        // Generate provisional password and set it via Better Auth
        const tempPw = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        const auth = createAuth(env);
        await auth.handler(new Request('https://patrouch.ca/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: tempPw })
        }));

        const t = {
          en: { subject: 'Your temporary password — Patrouch', title: 'Temporary Password', body: 'Here is your temporary password. Use it to log in, then change it in your account:', btn: 'Go to Login', footer: 'This password is temporary. Change it as soon as possible.' },
          es: { subject: 'Tu contraseña temporal — Patrouch', title: 'Contraseña Temporal', body: 'Aquí tienes tu contraseña temporal. Úsala para entrar y luego cámbiala en tu cuenta:', btn: 'Ir a Iniciar Sesión', footer: 'Esta contraseña es temporal. Cámbiala lo antes posible.' },
          fr: { subject: 'Votre mot de passe temporaire — Patrouch', title: 'Mot de Passe Temporaire', body: 'Voici votre mot de passe temporaire. Utilisez-le pour vous connecter, puis changez-le dans votre compte:', btn: 'Aller à la connexion', footer: 'Ce mot de passe est temporaire. Changez-le dès que possible.' }
        }[lang];
        const html = `
          <div style="max-width:480px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;background:#faf9f7;padding:2rem;border-radius:12px;">
            <div style="text-align:center;margin-bottom:2rem;"><h1 style="font-size:1.5rem;font-weight:400;color:#9a7b4f;margin:0;">Patrouch</h1></div>
            <h2 style="font-size:1.2rem;color:#1a1a1a;">${t.title}</h2>
            <p style="color:#666;font-size:0.95rem;">${t.body}</p>
            <div style="background:#09090b;border-radius:8px;padding:1rem;text-align:center;margin:1.5rem 0;font-family:monospace;font-size:1.25rem;color:#c9a87c;letter-spacing:2px;">${tempPw}</div>
            <div style="text-align:center;margin:2rem 0;">
              <a href="https://patrouch.ca/login" style="display:inline-block;padding:12px 32px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:8px;font-weight:600;">${t.btn}</a>
            </div>
            <p style="color:#999;font-size:0.75rem;text-align:center;">${t.footer}</p>
          </div>
        `;
        await sendMailgunEmail(user.email, t.subject, html, `${t.title}: ${tempPw}`, { MAILGUN_API_KEY: env.MAILGUN_API_KEY, MAILGUN_DOMAIN: env.MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL: env.MAILGUN_FROM_EMAIL });
      },
      onPasswordReset: async () => {
        return new Response(null, { status: 302, headers: { Location: '/login' } });
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
