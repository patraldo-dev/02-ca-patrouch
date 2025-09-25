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
                <p>Sign in to continue to ShelfTalk</p>
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
                        <span class="spinner"></span>
                        Signing in...
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>
            
            <div class="login-footer">
                <p>Don't have an account? <a href="/signup">Sign up</a></p>
            </div>
        </div>
        
        <div class="login-illustration">
            <div class="illustration-content">
                <h2>Discover Your Next Favorite Book</h2>
                <p>Join our community of book lovers and share your thoughts on the latest reads.</p>
                <div class="testimonial">
                    <blockquote>"ShelfTalk has transformed how I discover and discuss books. The reviews are thoughtful and the community is welcoming."</blockquote>
                    <cite>- A Happy Reader</cite>
                </div>
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
        background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
        padding: 20px;
    }
    
    .login-container {
        display: flex;
        width: 100%;
        max-width: 1000px;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        background: white;
    }
    
    .login-card {
        flex: 1;
        padding: 40px;
        display: flex;
        flex-direction: column;
    }
    
    .login-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .logo {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
    }
    
    .login-header h1 {
        font-size: 28px;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 8px 0;
    }
    
    .login-header p {
        color: #6b7280;
        margin: 0;
        font-size: 16px;
    }
    
    .error-message {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #fef2f2;
        color: #b91c1c;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        font-size: 14px;
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
        color: #374151;
        margin-bottom: 8px;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #f9fafb;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        background: white;
    }
    
    .form-group input:disabled {
        background-color: #f3f4f6;
        color: #9ca3af;
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
        color: #4b5563;
    }
    
    .checkbox-container input {
        display: none;
    }
    
    .checkbox-container .checkmark {
        width: 18px;
        height: 18px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        margin-right: 8px;
        position: relative;
        transition: background-color 0.2s, border-color 0.2s;
    }
    
    .checkbox-container input:checked + .checkmark {
        background-color: #3b82f6;
        border-color: #3b82f6;
    }
    
    .checkbox-container input:checked + .checkmark:after {
        content: "";
        position: absolute;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }
    
    .forgot-link {
        color: #3b82f6;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s;
    }
    
    .forgot-link:hover {
        color: #2563eb;
        text-decoration: underline;
    }
    
    .login-button {
        width: 100%;
        padding: 14px;
        background: #3b82f6;
        color: white;
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
        background: #2563eb;
    }
    
    .login-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
    }
    
    .login-footer {
        margin-top: auto;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
    }
    
    .login-footer a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
    }
    
    .login-footer a:hover {
        text-decoration: underline;
    }
    
    .login-illustration {
        flex: 1;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 60px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .illustration-content h2 {
        font-size: 32px;
        font-weight: 700;
        margin: 0 0 20px 0;
    }
    
    .illustration-content p {
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 40px;
        opacity: 0.9;
    }
    
    .testimonial {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        position: relative;
    }
    
    .testimonial:before {
        content: """;
        position: absolute;
        top: 10px;
        left: 10px;
        font-size: 60px;
        line-height: 1;
        opacity: 0.2;
        font-family: Georgia, serif;
    }
    
    .testimonial blockquote {
        margin: 0 0 15px 0;
        font-style: italic;
        font-size: 16px;
        line-height: 1.6;
        position: relative;
        z-index: 1;
    }
    
    .testimonial cite {
        font-style: normal;
        font-size: 14px;
        opacity: 0.8;
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
