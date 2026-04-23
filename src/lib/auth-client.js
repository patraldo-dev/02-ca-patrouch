// src/lib/auth-client.js — Better Auth client for Svelte components
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
    baseURL: '',
});
