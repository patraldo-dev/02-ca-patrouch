<!-- src/lib/components/NewsletterForm.svelte -->
<script>
    let email = '';
    let message = '';
    let loading = false;

    async function handleSubmit(e) {
        e.preventDefault();
        loading = true;
        message = '';

        const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'newsletter' })
        });

        const data = await res.json();

        if (data.success) {
            message = data.message;
            email = '';
        } else {
            message = data.message;
        }

        loading = false;
    }
</script>

<form on:submit|preventDefault={handleSubmit} class="newsletter-form">
    <h3>📚 Get Book Updates</h3>
    <p>Subscribe to get new reviews and reading recommendations.</p>
    <input
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        required
        aria-label="Email address"
    />
    <button type="submit" disabled={loading}>
        {loading ? 'Subscribing...' : 'Subscribe'}
    </button>
    {#if message}
        <p class="message">{message}</p>
    {/if}
</form>

<style>
    .newsletter-form {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        max-width: 400px;
        margin: 0 auto;
    }
    h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
        color: #333;
    }
    p {
        margin: 0 0 1rem 0;
        color: #666;
        font-size: 0.95rem;
    }
    input {
        width: 100%;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }
    button {
        width: 100%;
        padding: 0.75rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }
    button:hover:not(:disabled) {
        background: #2563eb;
    }
    button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    .message {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 6px;
        background: #dcfce7;
        color: #166534;
        font-size: 0.9rem;
        text-align: center;
    }
</style>
