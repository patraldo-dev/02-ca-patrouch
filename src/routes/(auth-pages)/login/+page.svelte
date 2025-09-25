<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    
    // Get data from server load function
    export let data;
    
    // Initialize with server-provided data
    $: redirectTo = data?.redirectTo || '/';
    $: initialError = data?.errorMessage || '';
    
    // Your existing variables
    let identifier = '';
    let password = '';
    let error = initialError; // Use server-provided error initially
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
                // Cookie is set automatically by server
                window.location.href = redirectTo; // Use the redirect URL
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

<div class="login-container" role="application" on:keydown={handleKeyDown}>
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
                {#if isLoading}
                    <span class="spinner"></span> Signing in...
                {:else}
                    Sign In
                {/if}
            </button>
        </form>
        
        <p class="footer">
            Don't have an account? <a href="/signup">Sign up</a>
        </p>
    </div>
</div>
