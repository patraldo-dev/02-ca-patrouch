<!-- src/routes/(auth-pages)/signup/+page.svelte -->
<script>
    import { browser } from '$app/environment';

    let username = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let error = '';
    let success = '';
    let isLoading = false;

    async function handleSignup() {
        if (password !== confirmPassword) {
            error = 'Passwords do not match';
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
                success = 'Account created! Please check your email to verify your address.';
            } else {
                error = result.error || 'Signup failed. Please try again.';
            }
        } catch (err) {
            console.error('Signup error:', err);
            error = 'Network error. Please try again.';
        } finally {
            isLoading = false;
        }
    }

    $: if (password && !confirmPassword) {
        confirmPassword = password;
    }
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

    <form on:submit|preventDefault={handleSignup}>
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

        {#if error}
            <p style="color: red; margin-top: 1rem;">{error}</p>
        {/if}

        <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
    </form>

    <p style="margin-top: 1rem;">
        Already have an account? <a href="/login">Log in</a>
    </p>
</main>

<style>
    main {
        max-width: 400px;
        margin: 4rem auto 2rem;
        padding: 2rem 2rem 1.5rem;
        border: 1px solid #27272a;
        border-radius: 8px;
        background: #141417;
        color: #e4e4e7;
        text-align: center;
    }

    .signup-icon {
        margin-bottom: 1rem;
        color: #c9a87c;
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
        color: #a1a1aa;
    }

    input {
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #27272a;
        border-radius: 4px;
        background: #1c1c21;
        color: #e4e4e7;
    }

    input:focus {
        outline: none;
        border-color: #c9a87c;
        box-shadow: 0 0 0 2px rgba(201, 168, 124, 0.15);
    }

    button {
        padding: 0.75rem;
        font-size: 1rem;
        background: #c9a87c;
        color: #09090b;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
    }

    button:hover {
        background: #b8976b;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    a {
        color: #c9a87c;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .success-banner {
        background: #14532d;
        color: #86efac;
        padding: 0.75rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
</style>
