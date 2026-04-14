<!-- src/lib/components/SubscribeForm.svelte -->
<script>
    import { t } from '$lib/i18n';

    let email = $state('');
    let type = $state('book-updates');
    let message = $state('');
    let loading = $state(false);

    async function handleSubmit(e) {
        e.preventDefault();
        loading = true;
        message = '';

        const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type })
        });

        const data = await res.json();

        if (data.success) {
            message = data.message || $t('common.subscribeForm.message.success');
            email = '';
        } else {
            message = data.message || $t('common.subscribeForm.message.error');
        }

        loading = false;
    }
</script>

<form onsubmit={handleSubmit} class="subscribe-form">
    <h3>{$t('common.subscribeForm.title')}</h3>
    <input
        type="email"
        bind:value={email}
        placeholder={$t('common.subscribeForm.placeholder')}
        required
        aria-label={$t('common.subscribeForm.aria.email')}
    />
    <select bind:value={type} aria-label={$t('common.subscribeForm.aria.type')}>
        <option value="book-updates">{$t('common.subscribeForm.options.bookUpdates')}</option>
        <option value="newsletter">{$t('common.subscribeForm.options.newsletter')}</option>
    </select>
    <button type="submit" disabled={loading}>
        {loading ? $t('common.subscribeForm.button.subscribing') : $t('common.subscribeForm.button.subscribe')}
    </button>
    {#if message}
        <p class="message">{message}</p>
    {/if}
</form>

<style>
    .subscribe-form {
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 1.5rem;
        border-radius: var(--radius-lg);
    }
    h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        font-family: var(--font-heading);
        font-weight: 300;
        color: var(--text);
    }
    input, select {
        width: 100%;
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
    }
    input:focus, select:focus {
        outline: none;
        border-color: var(--accent);
    }
    input::placeholder {
        color: var(--text-muted);
    }
    button {
        width: 100%;
        padding: 0.75rem;
        margin-top: 0.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    button:hover { background: var(--accent-hover); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .message {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: var(--radius);
        background: rgba(34, 197, 94, 0.1);
        color: #4ade80;
        font-size: 0.9rem;
        border: 1px solid rgba(34, 197, 94, 0.2);
    }
</style>
