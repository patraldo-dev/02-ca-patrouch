<!-- src/routes/(auth-pages)/signup/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';
    import { authClient } from '$lib/auth-client.js';

    let isAdult = $state(false);
    let username = $state('');
    let email = $state('');
    let password = $state('');
    let confirmPassword = $state('');

    function generatePassword() {
        const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
        let pwd = '';
        for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        return pwd;
    }

    // Auto-suggest a password on load
    onMount(() => {
        const suggested = generatePassword();
        password = suggested;
        confirmPassword = suggested;
    });
    let error = $state('');
    let success = $state('');
    let isLoading = $state(false);

    async function handleSignup() {
        if (!isAdult) {
            error = $t('signup.age_required');
            return;
        }
        if (password !== confirmPassword) {
            error = $t('signup.password_mismatch');
            return;
        }

        isLoading = true;
        error = '';
        success = '';

        try {
            const { error: authError } = await authClient.signUp.email({
                email,
                password,
                name: username
            });

            if (authError) {
                error = authError.message || 'Signup failed';
                success = $t('signup.success');
            } else {
                success = $t('signup.success');
            }
        } catch (err) {
            console.error('Signup error:', err);
            error = $t('signup.network_error');
        } finally {
            isLoading = false;
        }
    }

    $effect(() => {
        if (password && !confirmPassword) {
            confirmPassword = password;
        }
    });
</script>

<main>
    <svg class="signup-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" stroke="#c9a87c" stroke-width="1" opacity="0.3"/>
        <path d="M18 38 C18 30 22 22 28 22 C34 22 38 30 38 38" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M22 16 L26 28" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <circle cx="26" cy="28" r="1.5" fill="#c9a87c"/>
        <path d="M26 28 Q30 32 34 26" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>
    <h1>Create an Account</h1>

    {#if success}
<div class="success-banner">{success}</div>
    {/if}

    <!-- OAuth Providers -->
    <div class="oauth-section">
        <p class="oauth-divider">{$t('signup.or_continue_with') || 'or continue with'}</p>
        <div class="oauth-buttons">
            <button type="button" class="btn-oauth btn-google" onclick={() => authClient.signIn.social({ provider: 'google' })}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
            </button>
            <button type="button" class="btn-oauth btn-github" onclick={() => authClient.signIn.social({ provider: 'github' })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
            </button>
        </div>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
        <div>
            <label for="username">Username</label>
            <input
                id="username"
                bind:value={username}
                type="text"
                required
                placeholder="Choose a username"
                minlength="3"
                maxlength="32"
            />
        </div>

        <div>
            <label for="email">Email</label>
            <input
                id="email"
                bind:value={email}
                type="email"
                required
                placeholder="your@email.com"
            />
        </div>

        <div>
            <label for="password">Password</label>
            <div class="password-row">
                <input
    id="password"
    bind:value={password}
    type="password"
    placeholder="Create a password"
    required
    minlength="8"
    autocomplete="new-password"  
    disabled={isLoading}
                />
                <button type="button" class="btn-generate" onclick={() => { const p = generatePassword(); password = p; confirmPassword = p; }} disabled={isLoading}>🔄</button>
            </div>
        </div>

        <div>
            <label for="confirmPassword">Confirm Password</label>
            <input
id="confirmPassword"
    bind:value={confirmPassword}
    type="password"
    placeholder="Repeat your password"
    required
    autocomplete="new-password"  
    disabled={isLoading}
            />
        </div>

        <div class="checkbox-group">
            <input type="checkbox" id="adult" bind:checked={isAdult} required disabled={isLoading} />
            <label for="adult">{$t('signup.adult_confirm')}</label>
        </div>

        {#if error}
            <p style="color: red; margin-top: 1rem;">{error}</p>
        {/if}

        <button type="submit" disabled={isLoading}>
            {isLoading ? $t('signup.creating') : $t('signup.button')}
        </button>
    </form>

    <p style="margin-top: 1rem;">
        {$t('signup.have_account')} <a href="/login">{$t('signup.login_link')}</a>
    </p>
</main>

<style>
    main {
        max-width: 400px;
        margin: 4rem auto 2rem;
        padding: 2rem 2rem 1.5rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        color: var(--text-dim);
        text-align: center;
    }

    .signup-icon {
        margin-bottom: 1rem;
        color: var(--accent);
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    label {
        font-weight: bold;
        display: block;
        margin-bottom: 0.25rem;
        color: var(--text-dim);
    }

    .checkbox-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .checkbox-group input[type="checkbox"] {
        width: auto;
        accent-color: var(--accent);
    }

    .checkbox-group label {
        font-size: 0.85rem;
        color: var(--text-dim);
        cursor: pointer;
    }

    input {
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface);
        color: var(--text-dim);
    }

    input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(201, 168, 124, 0.15);
    }

    button {
        padding: 0.75rem;
        font-size: 1rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
    }

    button:hover {
        background: var(--accent-bg);
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    a {
        color: var(--accent);
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .success-banner {
        background: var(--surface);
        color: var(--accent);
        padding: 0.75rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .password-row { display: flex; gap: 0.5rem; }
    .password-row input { flex: 1; }
    .btn-generate { background: var(--surface, #141417); border: 2px solid var(--border); color: var(--text); padding: 0 0.75rem; border-radius: 8px; cursor: pointer; font-size: 1.1rem; }
    .btn-generate:hover { border-color: var(--accent, #c9a87c); }
    .oauth-section { margin-bottom: 1.5rem; }
    .oauth-divider { text-align: center; color: var(--muted, #a1a1aa); font-size: 0.85rem; margin-bottom: 1rem; position: relative; }
    .oauth-buttons { display: flex; gap: 0.75rem; }
    .btn-oauth { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1rem; border: 2px solid var(--border); border-radius: 8px; font-size: 0.9rem; cursor: pointer; background: var(--surface, #141417); color: var(--text); font-family: var(--font-body, 'Inter', sans-serif); transition: border-color 0.2s; }
    .btn-oauth:hover { border-color: var(--accent, #c9a87c); }
    .btn-google svg { flex-shrink: 0; }
    .btn-github { color: var(--text); }
</style>
