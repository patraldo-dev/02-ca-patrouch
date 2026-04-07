<!-- src/lib/components/NewsletterForm.svelte -->
<script>
    import { t, getLocale } from '$lib/i18n';

    let email = $state('');
    let isSubmitting = $state(false);
    let message = $state('');
    let isSuccess = $state(false);
    let needsConfirmation = $state(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email) {
            message = $t('common.newsletter.error_email_empty');
            return;
        }

        isSubmitting = true;
        message = '';

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type: 'daily-prompt', locale: getLocale() || 'en' })
            });

            const result = await response.json();

            if (response.ok) {
                isSuccess = true;
                needsConfirmation = true;
                message = $t('common.newsletter.success_message');
                email = '';
            } else {
                isSuccess = false;
                message = result.error || $t('common.newsletter.error_message');
            }
        } catch (error) {
            isSuccess = false;
            message = $t('common.newsletter.network_error');
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="newsletter-form">
    <h3>{$t('common.newsletter.title')}</h3>
    <p>{$t('common.newsletter.description')}</p>

    {#if message}
        <div class="message" class:success={isSuccess} class:error={!isSuccess}>
            {message}
            {#if needsConfirmation}
                <p class="confirmation-note">{$t('common.newsletter.confirmation_note')}</p>
            {/if}
        </div>
    {/if}

    <form onsubmit={handleSubmit}>
        <div class="input-group">
            <input
                type="email"
                bind:value={email}
                placeholder={$t('common.newsletter.email_placeholder')}
                required
                disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
                {#if isSubmitting}
                    {$t('common.newsletter.subscribing_button')}
                {:else}
                    {$t('common.newsletter.subscribe_button')}
                {/if}
            </button>
        </div>
    </form>
</div>

<style>
    .newsletter-form {
        max-width: 500px;
        margin: 0 auto;
        text-align: center;
    }

    .newsletter-form h3 {
        font-family: var(--font-heading);
        font-weight: 300;
        font-size: 1.35rem;
        margin-bottom: 0.5rem;
        color: var(--text);
    }

    .newsletter-form p {
        margin-bottom: 1.5rem;
        color: var(--text-muted);
        font-size: 0.95rem;
    }

    .input-group {
        display: flex;
        gap: 0.5rem;
    }

    .input-group input {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        transition: border-color 0.2s;
    }

    .input-group input:focus {
        outline: none;
        border-color: var(--accent);
    }

    .input-group input::placeholder {
        color: var(--text-muted);
    }

    .input-group button {
        padding: 0.75rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        white-space: nowrap;
    }

    .input-group button:hover {
        background: var(--accent-hover);
    }

    .input-group button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .message {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: var(--radius);
        text-align: center;
        font-size: 0.9rem;
    }

    .message.success {
        background: rgba(34, 197, 94, 0.1);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .message.error {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .confirmation-note {
        margin-top: 0.5rem;
        font-style: italic;
        font-size: 0.85rem;
        opacity: 0.8;
    }

    @media (max-width: 480px) {
        .input-group {
            flex-direction: column;
        }
    }
</style>
