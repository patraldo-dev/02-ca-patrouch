<!-- src/routes/reset-password/+page.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t } from '$lib/i18n';

    let password = $state('');
    let confirmPassword = $state('');
    let error = $state('');
    let success = $state('');
    let isLoading = $state(false);
    let token = '';

    if (browser) {
        const url = new URL(window.location);
        token = url.searchParams.get('token') || '';
        if (!token) {
            error = $t('reset.error_token');
        }
    }

    async function handleReset(e) {
        e.preventDefault();
        if (password !== confirmPassword) {
            error = $t('reset.error_match');
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
                success = $t('reset.success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                error = result.error || $t('reset.error_failed');
            }
        } catch {
            error = $t('reset.error_network');
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <h1>{$t('reset.title')}</h1>

        {#if success}
            <div class="success-banner">{success}</div>
        {:else if error}
            <div class="error-banner">{error}</div>
        {:else}
            <form onsubmit={handleReset}>
                <div class="input-group">
                    <label for="password">{$t('reset.password_label')}</label>
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
                    <label for="confirmPassword">{$t('reset.confirm_label')}</label>
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
                    {isLoading ? $t('reset.submitting') : $t('reset.submit')}
                </button>
            </form>
        {/if}
    </div>
</div>

<style>
    .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
        padding: 1.5rem;
    }
    .auth-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius, 12px);
        padding: 2.5rem 2rem;
        max-width: 400px;
        width: 100%;
    }
    .auth-card h1 {
        font-family: var(--font-heading, 'Playfair Display', serif);
        font-size: 1.5rem;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .input-group {
        margin-bottom: 1.25rem;
    }
    .input-group label {
        display: block;
        color: var(--text);
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
    }
    .input-group input {
        width: 100%;
        padding: 0.65rem 0.75rem;
        background: var(--bg);
        border: 2px solid var(--border);
        border-radius: var(--radius, 8px);
        color: var(--text);
        font-family: var(--font-body, 'Inter', sans-serif);
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s;
    }
    .input-group input:focus {
        border-color: var(--accent, #c9a87c);
    }
    button[type="submit"] {
        width: 100%;
        padding: 0.7rem;
        background: var(--accent, #c9a87c);
        color: var(--bg);
        border: none;
        border-radius: var(--radius, 8px);
        font-family: var(--font-body, 'Inter', sans-serif);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    button[type="submit"]:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    button[type="submit"]:hover:not(:disabled) {
        opacity: 0.9;
    }
    .success-banner {
        background: rgba(74, 222, 128, 0.1);
        border: 1px solid rgba(74, 222, 128, 0.3);
        color: #4ade80;
        padding: 0.75rem 1rem;
        border-radius: var(--radius, 8px);
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .error-banner {
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        color: #f87171;
        padding: 0.75rem 1rem;
        border-radius: var(--radius, 8px);
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
</style>
