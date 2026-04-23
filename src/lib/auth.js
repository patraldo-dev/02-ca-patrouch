// src/lib/auth.js — Better Auth + Drizzle adapter for SvelteKit + Cloudflare D1
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';

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
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
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
  });
}
