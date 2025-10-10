<!-- src/routes/confirmation-success/+page.svelte -->
<script>
    import { page } from '$app/stores';
    
    $: alreadyConfirmed = $page.url.searchParams.get('already') === 'true';
    $: type = $page.url.searchParams.get('type') || 'user'; // 'user' or 'newsletter'
</script>

<div class="container">
    <div class="confirmation-card">
        {#if alreadyConfirmed}
            <h1>Already Confirmed</h1>
            <p>
                {#if type === 'newsletter'}
                    Your newsletter subscription has already been confirmed. Thank you for subscribing!
                {:else}
                    Your email has already been verified. Thank you for confirming your account!
                {/if}
            </p>
        {:else}
            <h1>
                {#if type === 'newsletter'}
                    Newsletter Subscription Confirmed!
                {:else}
                    Email Verified!
                {/if}
            </h1>
            <p>
                {#if type === 'newsletter'}
                    Thank you for subscribing to our newsletter. You'll now receive updates about new books and reviews.
                {:else}
                    Thank you for verifying your email. Your account is now fully activated.
                {/if}
            </p>
        {/if}
        <a href="/" class="btn">Return to Homepage</a>
    </div>
</div>

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .confirmation-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 2rem;
        text-align: center;
    }
    
    h1 {
        color: #10b981;
        margin-bottom: 1rem;
    }
    
    p {
        color: #4b5563;
        margin-bottom: 1.5rem;
    }
    
    .btn {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: var(--primary-color);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    
    .btn:hover {
        background: var(--primary-dark);
    }
</style>
