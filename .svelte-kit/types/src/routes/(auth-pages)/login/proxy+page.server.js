// @ts-nocheck
// src/routes/(auth-pages)/login/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @param {Parameters<import('./$types').PageServerLoad>[0]} event */
export async function load({ url, locals }) {
    // If user is already logged in via Better Auth, redirect home
    if (locals.user) {
        throw redirect(302, '/');
    }

    return {
        redirectTo: url.searchParams.get('redirect') || '/',
        errorMessage: url.searchParams.get('error') || null,
    };
}
