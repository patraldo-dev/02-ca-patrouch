// src/lib/auth-client.js — Better Auth client for Svelte components
import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    baseURL: '',
    plugins: [
        usernameClient(),
    ],
});
