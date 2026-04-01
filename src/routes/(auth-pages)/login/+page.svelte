<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t } from '$lib/i18n';
    
    let { data } = $props();
    
    let redirectTo = $derived(data?.redirectTo || '/');
    let initialError = $derived(data?.errorMessage || '');
    
    let identifier = '';
    let password = '';
    let error = initialError;
    let isLoading = false;
    
    async function handleLogin() {
        if (!identifier || !password) {
            error = 'Please enter your email or username and password';
            return;
        }
        isLoading = true;
        error = '';
        try {
            const response = await fetch('/api/auth/login?redirectTo=' + encodeURIComponent(redirectTo), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const result = await response.json();
            if (response.ok) {
                window.location.href = redirectTo;
            } else {
                error = result.error || 'Invalid credentials';
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
                <p class="signup-link">{$t('auth.login.no_account')} <a href="/signup">{$t('auth.login.sign_up')}</a></p>
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
            
            <form on:submit|preventDefault={handleLogin} class="login-form">
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
                    <input
                        id="password"
                        bind:value={password}
                        type="password"
                        placeholder="{$t('auth.login.password_placeholder')}"
                        required
                        autocomplete="current-password"
                        disabled={isLoading}
                    />
                </div>
                
                <div class="form-options">
                    <label class="checkbox-container">
                        <input type="checkbox" />
                        <span class="checkmark"></span>
                        Remember me
                    </label>
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

            <div class="gold-divider"></div>

            <div class="subscribe-section">
                <p class="subscribe-text">{$t('auth.login.subscribe_text')}</p>
                <form class="subscribe-form" on:submit|preventDefault>
                    <input type="email" placeholder="{$t('auth.login.subscribe_placeholder')}" required />
                    <button type="submit">{$t('auth.login.subscribe_button')}</button>
                </form>
            </div>
        </div>
        
        <div class="login-illustration">
            <svg class="illustration-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="1" opacity="0.2"/>
                <path d="M40 16 L40 64" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
                <path d="M16 40 L64 40" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
                <text x="40" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-style="italic" fill="currentColor">CRP</text>
            </svg>
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
        max-width: 1000px;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        background: var(--surface);
        border: 1px solid #3f3f46;
    }
    
    .login-card {
        flex: 1;
        padding: 40px 40px 30px 40px;
        display: flex;
        flex-direction: column;
    }
    
    .login-header {
        text-align: center;
        margin-bottom: 20px;
    }
    
    .logo {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
    }
    
    .login-header h1 {
        font-size: 28px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 8px 0;
    }
    
    .login-header p {
        color: #d4d4d8;
        margin: 0 0 0 0;
        font-size: 16px;
    }
    
    .signup-link {
        color: #d4d4d8;
        font-size: 14px;
        margin-top: 8px !important;
    }
    
    .signup-link a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
    }
    
    .signup-link a:hover {
        text-decoration: underline;
    }
    
    .gold-divider {
        width: 40px;
        height: 2px;
        background: linear-gradient(to bottom, var(--accent), rgba(201, 168, 124, 0.3));
        margin: 16px auto;
        border-radius: 2px;
    }
    
        width: 40px;
        height: 2px;
        background: linear-gradient(to bottom, var(--accent), rgba(201, 168, 124, 0.3));
        margin: 16px auto;
        border-radius: 2px;

    .subscribe-section {
        margin-top: auto;
        text-align: center;
    }

    .subscribe-text {
        color: #d4d4d8;
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
    }

    .subscribe-form {
        display: flex;
        gap: 8px;
    }

    .subscribe-form input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #3f3f46;
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        font-size: 0.85rem;
        outline: none;
    }

    .subscribe-form input:focus {
        border-color: var(--accent);
    }

    .subscribe-form button {
        padding: 8px 16px;
        background: rgba(201, 168, 124, 0.15);
        color: var(--accent);
        border: 1px solid rgba(201, 168, 124, 0.3);
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        white-space: nowrap;
    }

    .subscribe-form button:hover {
        background: rgba(201, 168, 124, 0.25);
    }

    .error-message {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #1c1012;
        color: #fca5a5;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        font-size: 14px;
        border: 1px solid #3b1116;
    }
    
    .login-form {
        margin-bottom: 24px;
    }
    
    .form-group {
        text-align: left;
        margin-bottom: 20px;
    }
    
    .form-group label {
        text-align: left;
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dim);
        margin-bottom: 8px;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #3f3f46;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #1c1c21;
        color: #ffffff;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(201, 168, 124, 0.15);
    }
    
    .form-group input:disabled {
        background-color: #18181b;
        color: var(--text-muted);
        cursor: not-allowed;
    }
    
    .form-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }
    
    .checkbox-container {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 14px;
        color: var(--text-dim);
    }
    
    .checkbox-container input {
        display: none;
    }
    
    .checkbox-container .checkmark {
        width: 18px;
        height: 18px;
        border: 1px solid #3f3f46;
        border-radius: 4px;
        margin-right: 8px;
        position: relative;
        transition: background-color 0.2s, border-color 0.2s;
    }
    
    .checkbox-container input:checked + .checkmark {
        background-color: var(--accent);
        border-color: var(--accent);
    }
    
    .checkbox-container input:checked + .checkmark:after {
        content: "";
        position: absolute;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid #09090b;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }
    
    .forgot-link {
        color: var(--accent);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s;
    }
    
    .forgot-link:hover {
        color: #b8976b;
        text-decoration: underline;
    }
    
    .login-button {
        width: 100%;
        padding: 14px;
        background: #c9a87c;
        color: #09090b;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .login-button:hover {
        background: #b8976b;
    }
    
    .login-button:disabled {
        background: #3f3f46;
        color: var(--text-muted);
        cursor: not-allowed;
    }
    
    .login-footer {
        margin-top: auto;
        text-align: center;
        color: var(--text-muted);
        font-size: 14px;
    }
    
    .login-footer a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
    }
    
    .login-footer a:hover {
        text-decoration: underline;
    }
    
    .login-illustration {
        flex: 1;
        background: linear-gradient(135deg, #18181b 0%, #1c1c21 100%);
        color: var(--text);
        padding: 60px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-left: 1px solid #27272a;
    }

    .illustration-icon {
        color: var(--accent);
        margin-bottom: 2rem;
    }

    .illustration-label {
        font-family: var(--font-heading);
        font-size: 1.5rem;
        font-weight: 300;
        font-style: italic;
        color: var(--accent);
    }
    
    @media (max-width: 768px) {
        .login-container {
            flex-direction: column;
            max-width: 400px;
        }
        
        .login-card {
            padding: 30px 20px;
        }
        
        .login-illustration {
            display: none;
        }
        
        .login-header h1 {
            font-size: 24px;
        }
    }
</style>
