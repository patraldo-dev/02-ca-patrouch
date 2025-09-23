<!-- src/routes/reset-password/+page.svelte -->
<script>
    import { browser } from '$app/environment';

    let password = '';
    let confirmPassword = '';
    let error = '';
    let success = '';
    let isLoading = false;
    let token = '';

    if (browser) {
        const url = new URL(window.location);
        token = url.searchParams.get('token') || '';
        if (!token) {
            error = 'Invalid or missing reset token';
        }
    }

    async function handleReset() {
        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }

        isLoading = true;
        error = '';
        success = '';

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const result = await response.json();

            if (response.ok) {
                success = 'Password reset! Redirecting to login...';
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                error = result.error || 'Failed to reset password';
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
        <h1>Reset Password</h1>

        {#if success}
            <div class="success-banner">{success}</div>
        {:else if error}
            <div class="error-banner">{error}</div>
        {:else}
            <form on:submit|preventDefault={handleReset}>
                <div class="input-group">
                    <label for="password">New Password</label>
                    <input
                        id="password"
                        bind:value={password}
                        type="password"
                        placeholder="•••••••••••••••"
                        required
                        minlength="8"
                        autocomplete="new-password"
                    />
                </div>
                <div class="input-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        type="password"
                        placeholder="•••••••••••••••"
                        required
                        autocomplete="new-password"
                    />
                </div>
                <button type="submit" disabled={isLoading || !token}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        {/if}
    </div>
</div>

<style>
    /* Reuse your existing auth styles */
</style>
