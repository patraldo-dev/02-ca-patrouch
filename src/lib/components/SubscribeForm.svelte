<!-- src/lib/components/SubscribeForm.svelte -->
<script>
    let email = '';
    let type = 'book-updates';
    let message = '';
    let loading = false;

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
            message = data.message;
            email = '';
        } else {
            message = data.message;
        }

        loading = false;
    }
</script>

<form on:submit|preventDefault={handleSubmit} class="subscribe-form">
    <h3>📚 Get Book Updates</h3>
    <input
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        required
        aria-label="Email address"
    />
    <select bind:value={type} aria-label="Subscription type">
        <option value="book-updates">New Book Reviews</option>
        <option value="newsletter">Monthly Newsletter</option>
    </select>
    <button type="submit" disabled={loading}>
        {loading ? 'Subscribing...' : 'Subscribe'}
    </button>
    {#if message}
        <p class="message">{message}</p>
    {/if}
</form>

<style>
    .subscribe-form {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
    }
    input, select {
        width: 100%;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }
    button {
        width: 100%;
        padding: 0.75rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    button:disabled {
        background: #9ca3af;
    }
    .message {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 4px;
        background: #dcfce7;
        color: #166534;
        font-size: 0.9rem;
    }
</style>
