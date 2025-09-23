<!-- src/routes/(auth-pages)/forgot-password/+page.svelte -->
<script>
    import { browser } from '$app/environment';

    let email = '';
    let error = '';
    let success = '';
    let isLoading = false;

    async function handleForgotPassword() {
        if (!email) {
            error = 'Please enter your email';
            return;
        }

        isLoading = true;
        error = '';
        success = '';

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                success = 'Password reset link sent! Check your email.';
            } else {
                error = result.error || 'Failed to send reset link';
            }
        } catch (err) {
            error = 'Network error. Please try again.';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <h1>Forgot Password?</h1>
        <p>Enter your email and we’ll send you a reset link.</p>

        {#if success}
            <div class="success-banner">{success}</div>
        {/if}

        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <form on:submit|preventDefault={handleForgotPassword}>
            <div class="input-group">
                <label for="email">Email</label>
                <input
                    id="email"
                    bind:value={email}
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                />
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
        </form>

        <p class="footer">
            Remember your password? <a href="/login">Log in</a>
        </p>
    </div>
</div>

<style>
    /* Reuse your existing auth styles or add minimal ones */
    .auth-container { /* ... */ }
    .auth-card { /* ... */ }
    .input-group { /* ... */ }
    .success-banner { /* ... */ }
    .error-banner { /* ... */ }
    button { /* ... */ }
</style>
