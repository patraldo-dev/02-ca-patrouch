// src/hooks.server.js
/**
 * SvelteKit server hook — Better Auth + D1
 */
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};

import { createAuth } from '$lib/auth.js';
import { building } from '$app/environment';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Skip during build
    if (building) return resolve(event);

    // ⚠️ CRITICAL: Force real D1 — no mock, no fallback
    if (!event.platform?.env?.DB_book) {
        throw new Error('❌ D1 database binding "DB_book" not found. Check wrangler.jsonc.');
    }

    event.locals.db = event.platform.env.DB_book;
    event.locals.platform = event.platform;

    // Read locale from cookie
    const localeCookie = event.cookies.get('preferredLanguage') || event.cookies.get('locale');
    event.locals.locale = ['en', 'es', 'fr'].includes(localeCookie) ? localeCookie : 'es';

    // Log Mailgun key for debugging
    if (event.platform?.env?.MAILGUN_API_KEY) {
        console.log('🔑 MAILGUN_API_KEY is set (length:', event.platform.env.MAILGUN_API_KEY.length, ')');
    } else {
        console.error('❌ MAILGUN_API_KEY is MISSING or undefined');
    }

    // Better Auth — create per-request instance with D1 binding
    const auth = createAuth(event.platform.env);
    event.locals.auth = auth;

    // Get session via Better Auth
    try {
        const session = await auth.api.getSession({
            headers: event.request.headers,
        });

        if (session) {
            event.locals.session = session.session;
            event.locals.user = {
                id: session.user.id,
                username: session.user.email?.split('@')[0] || session.user.name || 'unknown',
                email: session.user.email,
                email_verified: session.user.emailVerified,
                role: session.user.role || 'user',
                bio: session.user.bio || null,
                avatar_url: session.user.image || null,
                display_name: session.user.name || null,
                created_at: session.user.createdAt,
            };
            console.log('✅ Better Auth session:', event.locals.user.username);
        } else {
            event.locals.session = null;
            event.locals.user = null;
            console.log('📭 No Better Auth session');
        }
    } catch (e) {
        console.error('❌ Better Auth session error:', e.message);
        event.locals.session = null;
        event.locals.user = null;
    }

    return resolve(event);
}
