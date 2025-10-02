<!-- src/lib/components/NewsletterForm.svelte -->
<script>
    import { t } from '$lib/translations';
    import { get } from 'svelte/store';
   
    let email = '';
    let isSubmitting = false;
    let message = '';
    let isSuccess = false;
    let needsConfirmation = false;

    async function handleSubmit() {
        if (!email) {
            message = get(t)('newsletter.error_email_empty');
            return;
        }

        isSubmitting = true;
        message = '';

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                isSuccess = true;
                needsConfirmation = true;
                message = get(t)('newsletter.success_message');
                email = '';
            } else {
                isSuccess = false;
                message = result.error || get(t)('newsletter.error_message');
            }
        } catch (error) {
            isSuccess = false;
            message = $t('newsletter.network_error');
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="newsletter-form">
    <h3>{$t('newsletter.title')}</h3>
    <p>{$t('newsletter.description')}</p>
    
    {#if message}
        <div class="message" class:success={isSuccess} class:error={!isSuccess}>
            {message}
            {#if needsConfirmation}
                <p class="confirmation-note">{$t('newsletter.confirmation_note')}</p>
            {/if}
        </div>
    {/if}
    
    <form on:submit|preventDefault={handleSubmit}>
        <div class="input-group">
            <input
                type="email"
                bind:value={email}
                placeholder={$t('newsletter.email_placeholder')}
                required
                disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
                {#if isSubmitting}
                    {$t('newsletter.subscribing_button')}
                {:else}
                    {$t('newsletter.subscribe_button')}
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
        margin-bottom: 0.5rem;
        color: #333;
    }
    
    .newsletter-form p {
        margin-bottom: 1.5rem;
        color: #666;
    }
    
    .input-group {
        display: flex;
        gap: 0.5rem;
    }
    
    .input-group input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .input-group button {
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .input-group button:hover {
        background: #2563eb;
    }
    
    .input-group button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    
    .message {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        text-align: center;
    }
    
    .message.success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }
    
    .message.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
    }
    
    .confirmation-note {
        margin-top: 0.5rem;
        font-style: italic;
        font-size: 0.9rem;
    }
</style>
