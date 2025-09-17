<!-- src/routes/confirmation-success/+page.svelte -->
<script>
    import { page } from '$app/stores';
</script>

<svelte:head>
    <title>Confirmation Success — ShelfTalk</title>
</svelte:head>

<div class="container">
    {#if $page.url.searchParams.get('already') === 'true'}
        <h1>✅ Already Confirmed</h1>
        <p>You're already subscribed — no need to confirm again!</p>
    {:else}
        <h1>✅ Confirmed!</h1>
        <p>Thank you for subscribing to ShelfTalk updates!</p>
    {/if}
    <a href="/" class="btn-primary">Back to Home</a>
</div>

<style>
    .container {
        max-width: 600px;
        margin: 4rem auto;
        padding: 2rem;
        text-align: center;
    }
    h1 {
        color: #166534;
        margin-bottom: 1rem;
    }
    p {
        font-size: 1.1rem;
        color: #555;
        margin-bottom: 2rem;
    }
    .btn-primary {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
</style>
