<!-- src/routes/(auth-pages)/forgot-password/+page.svelte -->
<script>
    import { t } from '$lib/i18n';

    let email = $state('');
    let error = $state('');
    let success = $state('');
    let isLoading = $state(false);

    async function handleForgotPassword(e) {
        e.preventDefault();
        if (!email) {
            error = $t('forgot.error_empty');
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
                success = $t('forgot.success');
            } else {
                error = result.error || $t('forgot.error_failed');
            }
        } catch {
            error = $t('forgot.error_network');
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <h1>{$t('forgot.title')}</h1>
        <p>{$t('forgot.subtitle')}</p>

        {#if success}
            <div class="success-banner">{success}</div>
        {/if}

        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <form onsubmit={handleForgotPassword}>
            <div class="input-group">
                <label for="email">{$t('forgot.email_label')}</label>
                <input
                    id="email"
                    bind:value={email}
                    type="email"
                    placeholder={$t('forgot.email_placeholder')}
                    required
                    disabled={isLoading}
                />
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? $t('forgot.submitting') : $t('forgot.submit')}
            </button>
        </form>

        <p class="footer">
            {$t('forgot.footer_text')} <a href="/login">{$t('forgot.footer_link')}</a>
        </p>
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
        background: var(--surface, #141417);
        border: 1px solid var(--border, rgba(255,255,255,0.1));
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
    .auth-card > p {
        color: var(--text-dim, #a1a1aa);
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
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
        background: var(--bg, #09090b);
        border: 2px solid var(--border, rgba(255,255,255,0.1));
        border-radius: var(--radius, 8px);
        color: var(--text-body, #e4e4e7);
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
        color: #09090b;
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
    .footer {
        margin-top: 1.5rem;
        text-align: center;
        color: var(--text-dim, #a1a1aa);
        font-size: 0.85rem;
    }
    .footer a {
        color: var(--accent, #c9a87c);
        text-decoration: none;
    }
    .footer a:hover {
        text-decoration: underline;
    }
</style>
