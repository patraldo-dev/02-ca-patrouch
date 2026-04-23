<!-- src/routes/(auth-pages)/signup/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';

    let isAdult = $state(false);
    let username = $state('');
    let email = $state('');
    let password = $state('');
    let confirmPassword = $state('');

    function generatePassword() {
        const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
        let pwd = '';
        for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        password = pwd;
        confirmPassword = pwd;
    }
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
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const result = await response.json();

            if (response.ok) {
                success = $t('signup.success');
            } else {
                error = result.error || $t('signup.failed');
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
                <button type="button" class="btn-generate" onclick={generatePassword} disabled={isLoading}>🎲</button>
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
</style>
