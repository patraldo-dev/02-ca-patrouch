<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';

    let identifier = '';
    let password = '';
    let error = '';
    let isLoading = false;

    async function handleLogin() {
        if (!identifier || !password) {
            error = 'Please enter your email or username and password';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const result = await response.json();

            if (response.ok) {
                // Cookie is set automatically by server
                window.location.href = '/';
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

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !isLoading) {
            handleLogin();
        }
    }
</script>

<div class="login-container" on:keydown={handleKeyDown}>
    <div class="login-card">
        <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h1 class="title">Welcome Back</h1>
        <p class="subtitle">Sign in to your account</p>

        {#if error}
            <div class="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleLogin} class="login-form">
            <div class="input-group">
                <label for="identifier">Email or Username</label>
                <input
                    id="identifier"
                    bind:value={identifier}
                    type="text"
                    placeholder="Enter email or username"
                    required
                    autocomplete="username"
                    disabled={isLoading}
                />
            </div>

            <div class="input-group">
                <label for="password">Password</label>
                <input
                    id="password"
                    bind:value={password}
                    type="password"
                    placeholder="•••••••••••••••"
                    required
                    autocomplete="current-password"
                    disabled={isLoading}
                />
            </div>

            <button type="submit" class="login-btn" disabled={isLoading}>
                {isLoading ? 
                    '<span class="spinner"></span> Signing in...' : 
                    'Sign In'}
            </button>
        </form>

        <p class="footer">
            Don't have an account? <a href="/signup">Sign up</a>
        </p>
    </div>
</div>

<style>
    .login-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 2.5rem;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        animation: fadeInUp 0.6s ease;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .logo svg {
        color: #667eea;
        width: 48px;
        height: 48px;
    }

    .title {
        font-size: 1.75rem;
        font-weight: 700;
        text-align: center;
        color: #333;
        margin: 0 0 0.5rem 0;
    }

    .subtitle {
        text-align: center;
        color: #666;
        margin: 0 0 2rem 0;
    }

    .error-banner {
        background: rgba(255, 99, 99, 0.1);
        border: 1px solid rgba(255, 99, 99, 0.3);
        color: #d32f2f;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .error-banner svg {
        color: #d32f2f;
        flex-shrink: 0;
    }

    .input-group {
        margin-bottom: 1.25rem;
    }

    .input-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #444;
        font-size: 0.9rem;
    }

    .input-group input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid #e1e5e9;
        border-radius: 12px;
        font-size: 1rem;
        transition: all 0.2s ease;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .input-group input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .input-group input:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
    }

    .login-btn {
        width: 100%;
        padding: 0.875rem 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
    }

    .login-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .login-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .footer {
        margin-top: 2rem;
        text-align: center;
        color: #666;
        font-size: 0.9rem;
    }

    .footer a {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
    }

    .footer a:hover {
        text-decoration: underline;
    }

    @media (max-width: 480px) {
        .login-card {
            margin: 1rem;
            padding: 2rem 1.5rem;
        }
        .title {
            font-size: 1.5rem;
        }
    }
</style>
