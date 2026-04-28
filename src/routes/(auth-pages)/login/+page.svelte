<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t } from '$lib/i18n';
    import { authClient } from '$lib/auth-client.js';
    
    let { data } = $props();
    
    let redirectTo = $derived(data?.redirectTo || '/');
    let error = $state(data?.errorMessage || '');
    let isLoading = $state(false);
    let identifier = $state('');
    let password = $state('');
    let showPassword = $state(false);
    
    async function handleLogin() {
        if (!identifier || !password) {
            error = 'Please enter your email or username and password';
            return;
        }
        isLoading = true;
        error = '';
        try {
            const { error: authError } = await authClient.signIn.email({
                email: identifier,
                password
            });
            if (authError) {
                error = authError.message || 'Invalid credentials';
            } else {
                window.location.href = redirectTo;
            }
        } catch (err) {
            console.error('Login error:', err);
            error = 'Network error. Please try again.';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="login-page">
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1>{$t('auth.login.title')}</h1>
                <p>{$t('auth.login.subtitle')}</p>
            </div>
            
            {#if error}
                <div class="error-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                        <path d="M12 8V12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        <path d="M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>{error}</span>
                </div>
            {/if}

            <!-- OAuth Providers -->
            <div class="oauth-section">
                <button type="button" class="btn-oauth btn-google" onclick={() => authClient.signIn.social({ provider: 'google' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                </button>
                <button type="button" class="btn-oauth btn-github" onclick={() => authClient.signIn.social({ provider: 'github' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                </button>
            </div>

            <!-- Divider -->
            <div class="divider">
                <span class="divider-line"></span>
                <span class="divider-text">or</span>
                <span class="divider-line"></span>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="login-form">
                <div class="form-group">
                    <label for="identifier">{$t('auth.login.email_label')}</label>
                    <input
                        id="identifier"
                        bind:value={identifier}
                        type="text"
                        placeholder="{$t('auth.login.email_placeholder')}"
                        required
                        autocomplete="username"
                        disabled={isLoading}
                    />
                </div>
                
                <div class="form-group">
                    <label for="password">{$t('auth.login.password_label')}</label>
                    <div class="password-wrapper">
                        <input
                            id="password"
                            bind:value={password}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="{$t('auth.login.password_placeholder')}"
                            required
                            autocomplete="current-password"
                            disabled={isLoading}
                        />
                        <button type="button" class="toggle-password" onclick={(e) => { e.preventDefault(); showPassword = !showPassword; }} aria-label="Toggle password visibility">
                            {#if showPassword}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            {:else}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            {/if}
                        </button>
                    </div>
                </div>
                
                <div class="form-options">
                    <a href="/forgot-password" class="forgot-link">{$t('auth.login.forgot')}</a>
                </div>
                
                <button type="submit" class="login-button" disabled={isLoading}>
                    {#if isLoading}
                        {$t('auth.login.signing_in')}
                    {:else}
                        {$t('auth.login.sign_in')}
                    {/if}
                </button>
            </form>

            <p class="signup-link">{$t('auth.login.no_account')} <a href="/signup">{$t('auth.login.sign_up')}</a></p>
        </div>
    </div>
</div>

<style>
    .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        padding: 20px;
        padding-top: 80px;
    }
    
    .login-container {
        display: flex;
        width: 100%;
        max-width: 440px;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        background: var(--surface);
        border: 1px solid var(--border);
    }
    
    .login-card {
        flex: 1;
        padding: 40px 40px 30px 40px;
        display: flex;
        flex-direction: column;
    }
    
    .login-header {
        text-align: center;
        margin-bottom: 32px;
    }
    
    .login-header h1 {
        font-size: 31px;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 8px 0;
    }
    
    .login-header p {
        color: var(--text-dim);
        margin: 0;
        font-size: 16px;
    }
    
    .error-message {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--surface);
        color: var(--text-dim);
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        font-size: 14px;
        border: 1px solid var(--border);
    }

    /* OAuth buttons */
    .oauth-section { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
    .btn-oauth { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1rem; border: 2px solid var(--border); border-radius: 8px; font-size: 0.9rem; cursor: pointer; background: var(--surface, #141417); color: var(--text); font-family: var(--font-body, 'Inter', sans-serif); transition: border-color 0.2s; }
    .btn-oauth:hover { border-color: var(--accent, #c9a87c); }
    .btn-github { color: var(--text); }

    /* Divider */
    .divider {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 1.5rem;
    }
    .divider-line {
        flex: 1;
        height: 1px;
        background: var(--border);
    }
    .divider-text {
        color: var(--muted, #a1a1aa);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .login-form {
        margin-bottom: 24px;
    }
    
    .form-group {
        text-align: left;
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dim);
        margin-bottom: 8px;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--border);
        border-radius: 8px;
        font-size: 16px;
        background: var(--surface);
        color: var(--text);
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(201, 168, 124, 0.15);
    }
    
    .form-group input:disabled {
        color: var(--text-muted);
        cursor: not-allowed;
    }
    
    .form-group input::placeholder {
        color: var(--text-muted);
        opacity: 1;
    }

    .password-wrapper {
        position: relative;
    }

    .password-wrapper input {
        padding-right: 48px;
    }

    .toggle-password {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toggle-password:hover {
        color: var(--accent);
    }
    
    .form-options {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 24px;
    }
    
    .forgot-link {
        color: var(--accent);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
    }
    
    .forgot-link:hover {
        text-decoration: underline;
    }
    
    .login-button {
        width: 100%;
        padding: 14px;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .login-button:hover { background: var(--accent-bg); }
    
    .login-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .signup-link {
        text-align: center;
        color: var(--text-dim);
        font-size: 14px;
        margin-top: auto;
        padding-top: 8px;
    }
    
    .signup-link a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
    }
    
    .signup-link a:hover { text-decoration: underline; }
    
    @media (max-width: 768px) {
        .login-container { max-width: 400px; }
        .login-card { padding: 30px 20px; }
        .login-header h1 { font-size: 24px; }
    }
</style>
