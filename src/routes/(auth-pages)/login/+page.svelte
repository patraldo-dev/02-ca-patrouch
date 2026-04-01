<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    
    export let data;
    
    $: redirectTo = data?.redirectTo || '/';
    $: initialError = data?.errorMessage || '';
    
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
                <div class="logo">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3b82f6"/>
                        <path d="M2 17L12 22L22 17" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h1>Welcome Back</h1>
                <p>Sign in to continue writing</p>
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
                    <label for="identifier">Email or Username</label>
                    <input
                        id="identifier"
                        bind:value={identifier}
                        type="text"
                        placeholder="Enter your email or username"
                        required
                        autocomplete="username"
                        disabled={isLoading}
                    />
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        id="password"
                        bind:value={password}
                        type="password"
                        placeholder="Enter your password"
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
                    <a href="/forgot-password" class="forgot-link">Forgot password?</a>
                </div>
                
                <button type="submit" class="login-button" disabled={isLoading}>
                    {#if isLoading}
                        Signing in...
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>
            
            <div class="gold-divider"></div>
            
            <p class="signup-link">Don't have an account? <a href="/signup">Sign up</a></p>
        </div>
        
        <div class="login-illustration">
            <div class="illustration-content">
                <div class="monogram">CRP</div>
                <p class="monogram-sub">Christophe R Patraldo</p>
            </div>
        </div>
    </div>
</div>

<style>
    .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #09090b;
        padding: 20px;
    }
    
    .login-container {
        display: flex;
        width: 100%;
        max-width: 1000px;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        background: #141417;
        border: 1px solid #27272a;
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
        color: #e4e4e7;
        margin: 0 0 8px 0;
    }
    
    .login-header p {
        color: #71717a;
        margin: 0 0 0 0;
        font-size: 16px;
    }
    
    .signup-link {
        color: #71717a;
        font-size: 14px;
        margin-top: 8px !important;
    }
    
    .signup-link a {
        color: #c9a87c;
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
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #a1a1aa;
        margin-bottom: 8px;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #27272a;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #1c1c21;
        color: #e4e4e7;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: #c9a87c;
        box-shadow: 0 0 0 3px rgba(201, 168, 124, 0.15);
    }
    
    .form-group input:disabled {
        background-color: #18181b;
        color: #71717a;
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
        color: #a1a1aa;
    }
    
    .checkbox-container input {
        display: none;
    }
    
    .checkbox-container .checkmark {
        width: 18px;
        height: 18px;
        border: 1px solid #27272a;
        border-radius: 4px;
        margin-right: 8px;
        position: relative;
        transition: background-color 0.2s, border-color 0.2s;
    }
    
    .checkbox-container input:checked + .checkmark {
        background-color: #c9a87c;
        border-color: #c9a87c;
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
        color: #c9a87c;
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
        color: #71717a;
        cursor: not-allowed;
    }
    
    .login-footer {
        margin-top: auto;
        text-align: center;
        color: #71717a;
        font-size: 14px;
    }
    
    .login-footer a {
        color: #c9a87c;
        text-decoration: none;
        font-weight: 600;
    }
    
    .login-footer a:hover {
        text-decoration: underline;
    }
    
    .login-illustration {
        flex: 1;
        background: linear-gradient(135deg, #18181b 0%, #1c1c21 100%);
        color: #e4e4e7;
        padding: 60px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-left: 1px solid #27272a;
    }

    .monogram {
        font-family: var(--font-heading);
        font-size: 4rem;
        font-weight: 300;
        font-style: italic;
        color: var(--accent);
        letter-spacing: 0.1em;
        margin-bottom: 0.75rem;
        text-align: center;
    }

    .monogram-sub {
        font-size: 0.85rem;
        font-weight: 500;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--text-muted);
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
