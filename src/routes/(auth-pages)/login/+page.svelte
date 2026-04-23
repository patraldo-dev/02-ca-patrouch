<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t } from '$lib/i18n';
    
    let { data } = $props();
    
    let redirectTo = $derived(data?.redirectTo || '/');
    let error = $state(data?.errorMessage || '');
    let isLoading = $state(false);
    let identifier = $state('');
    let password = $state('');
    
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
        </div>
    </div>

    <a href="#footer" class="hero-scroll" aria-label="Scroll to subscribe">
        <span class="scroll-line"></span>
    </a>
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
        margin-bottom: 36px;
    }
    
    .logo {
        display: flex;
        justify-content: center;
        margin-bottom: 0;
    }
    
    .login-header h1 {
        font-size: 31px;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 12px 0;
    }
    
    .login-header p {
        color: var(--text-dim);
        margin: 0 0 0 0;
        font-size: 16px;
    }
    
    .signup-link {
        color: var(--text-dim);
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
        border: 2px solid var(--border);
        border-radius: 8px;
        font-size: 16px;
        background: var(--surface);
        color: var(--text);
        transition: border-color 0.2s, box-shadow 0.2s;
        background: var(--surface);
        color: var(--text);
    }
    
    .form-group input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(201, 168, 124, 0.15);
    }
    
    .form-group input:disabled {
        background-color: var(--surface);
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
        border: 1px solid var(--border);
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
        border: solid var(--bg);
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
        color: var(--accent-bg);
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .login-button:hover {
        background: var(--accent-bg);
    }
    
    .login-button:disabled {
        background: var(--border);
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
    

    .hero-scroll {
        display: flex;
        justify-content: center;
        padding: 32px 0;
        text-decoration: none;
    }

    .hero-scroll .scroll-line {
        width: 2px;
        height: 48px;
        background: linear-gradient(to bottom, var(--accent), transparent);
        animation: scrollPulse 2s ease-in-out infinite;
        transition: height 0.3s ease;
    }

    .hero-scroll:hover .scroll-line {
        height: 64px;
    }

    @keyframes scrollPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    .form-group input::placeholder {
        color: var(--text-muted);
        opacity: 1;
    }
    
        @media (max-width: 768px) {
        .login-container {
            max-width: 400px;
        }
        
        .login-card {
            padding: 30px 20px;
        }
        
        .login-header h1 {
            font-size: 24px;
        }
    }
</style>
