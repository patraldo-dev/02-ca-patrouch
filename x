<!-- src/lib/components/NewsletterForm.svelte -->
<script>
    import { t } from '$lib/translations';
    
    let email = '';
    let isSubmitting = false;
    let message = '';
    let isSuccess = false;
    let needsConfirmation = false;

    async function handleSubmit() {
        if (!email) {
            message = $t('newsletter.error_email_empty');
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
                message = $t('newsletter.success_message');
                email = '';
            } else {
                isSuccess = false;
                message = result.error || $t('newsletter.error_message');
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
    /* Your existing styles remain unchanged */
    .newsletter-form {
        /* ... */
    }
    
    .message {
        /* ... */
    }
    
    .input-group {
        /* ... */
    }
    
    /* ... rest of your styles */
</style>
