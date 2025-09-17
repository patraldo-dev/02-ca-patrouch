<!-- src/routes/verify/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>Email Verification — ShelfTalk</title>
</svelte:head>

<div class="container">
    {#if data.status === 200 && data.success}
        <div class="alert success">
            ✅ <strong>Email verified!</strong> You can now <a href="/login">log in</a>.
        </div>
    {:else if data.status === 400}
        <div class="alert error">
            ❌ {data.error}
        </div>
        <p>
            <a href="/signup">Sign up</a> for a new account.
        </p>
    {:else}
        <div class="alert error">
            ❌ Something went wrong. Please try again later.
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 600px;
        margin: 4rem auto;
        padding: 2rem;
        text-align: center;
    }
    .alert {
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
        font-weight: 500;
    }
    .success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }
    a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
    }
    a:hover {
        text-decoration: underline;
    }
</style>
