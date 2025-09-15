<!-- src/routes/signup/+page.svelte -->
<svelte:head>
    <title>Sign Up — ShelfTalk</title>
</svelte:head>

<div class="container">
    <h1>Sign Up</h1>
    <p>Join ShelfTalk to post reviews, comment, and participate in writing exercises.</p>
    <p>Coming soon with email verification via Mailgun!</p>
    <a href="/" class="btn-secondary">← Back to Home</a>
</div>

<style>
    .container {
        max-width: 400px;
        margin: 4rem auto;
        padding: 2rem;
        text-align: center;
    }
    .btn-secondary {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #e5e7eb;
        text-decoration: none;
        border-radius: 6px;
        color: #333;
    }
</style>
