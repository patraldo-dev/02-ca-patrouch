// src/hooks.server.js
/**
 * SvelteKit server hook — Better Auth + D1
 */
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};

import { createAuth } from '$lib/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Skip during build
    if (building) return resolve(event);

    // ⚠️ CRITICAL: Force real D1
    if (!event.platform?.env?.DB_book) {
        throw new Error('❌ D1 database binding "DB_book" not found.');
    }

    event.locals.db = event.platform.env.DB_book;
    event.locals.platform = event.platform;

    // Locale
    const localeCookie = event.cookies.get('preferredLanguage') || event.cookies.get('locale');
    event.locals.locale = ['en', 'es', 'fr'].includes(localeCookie) ? localeCookie : 'es';

    // Better Auth — intercept /api/auth/* first
    const auth = createAuth(event.platform.env);
    event.locals.auth = auth;

    if (event.url.pathname.startsWith('/api/auth')) {
        return svelteKitHandler({ event, resolve, auth, building });
    }

    // Session for non-auth routes
    try {
        const session = await auth.api.getSession({ headers: event.request.headers });
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
        } else {
            event.locals.session = null;
            event.locals.user = null;
        }
    } catch (e) {
        console.error('❌ Session error:', e.message);
        event.locals.session = null;
        event.locals.user = null;
    }

    return resolve(event);
}
