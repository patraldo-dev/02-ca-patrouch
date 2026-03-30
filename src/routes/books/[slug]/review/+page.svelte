<!-- src/routes/books/[id]/review/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    export let data;
    const { book, user } = data;

    let rating = 5;
    let content = '';
    let error = '';
    let success = false;

    const handleSubmit = async (event) => {
        error = '';
        success = false;

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        const res = await fetch(`/api/books/${book.id}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) {
            error = result.error || 'Failed to post review';
            return;
        }

        success = true;
        content = '';
        rating = 5;

        // Optionally redirect to book page
        // window.location.href = `/books/${book.id}`;
    };
</script>

<svelte:head>
    <title>Review: {book.title} — Ex Libris</title>
</svelte:head>

<div class="container">
    <a href="/books/{book.id}" class="back-btn">← Back to {book.title}</a>

    <h1>Write a Review for “{book.title}”</h1>

    {#if success}
        <div class="alert success">
            ✅ Your review has been posted!
        </div>
    {:else}
        {#if error}
            <div class="alert error">
                ❌ {error}
            </div>
        {/if}

        <div class="book-header">
            {#if book.cover_image_url}
                <img src={book.cover_image_url} alt={book.title} class="cover-large" />
            {/if}
            <div class="book-meta">
                <h2>{book.title}</h2>
                <h3>by {book.author}</h3>
            </div>
        </div>

        <form on:submit|preventDefault={handleSubmit} use:enhance class="review-form">
            <div class="form-group">
                <label>
                    Rating:
                    <select bind:value={rating} name="rating">
                        <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                        <option value="4">⭐⭐⭐⭐ (4/5)</option>
                        <option value="3">⭐⭐⭐ (3/5)</option>
                        <option value="2">⭐⭐ (2/5)</option>
                        <option value="1">⭐ (1/5)</option>
                    </select>
                </label>
            </div>
            <div class="form-group">
                <label for="content">Your Review</label>
                <textarea
                    id="content"
                    name="content"
                    bind:value={content}
                    required
                    minlength="10"
                    placeholder="Share your thoughts about this book..."
                    rows="6"
                ></textarea>
            </div>
            <button type="submit" class="btn-primary">
                Post Review
            </button>
        </form>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
    }
    .back-btn {
        display: inline-block;
        margin-bottom: 2rem;
        color: var(--accent, #c9a87c);
        text-decoration: none;
        font-weight: 500;
    }
    .book-header {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
        align-items: flex-start;
    }
    .cover-large {
        width: 200px;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .book-meta h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.8rem;
        color: var(--text, #e4e4e7);
    }
    .book-meta h3 {
        margin: 0 0 1rem 0;
        color: var(--muted, #71717a);
        font-size: 1.2rem;
    }
    .review-form {
        background: var(--surface, #141417);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border: 1px solid var(--border, #27272a);
    }
    .form-group {
        margin-bottom: 1.5rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text, #e4e4e7);
    }
    select, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border, #27272a);
        border-radius: 6px;
        font-size: 1rem;
        font-family: inherit;
        background: var(--surface-2, #1c1c21);
        color: var(--text, #e4e4e7);
    }
    textarea {
        resize: vertical;
        min-height: 120px;
    }
    button {
        width: 100%;
        padding: 0.75rem;
        background: var(--accent, #c9a87c);
        color: var(--bg, #09090b);
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    button:hover {
        background: var(--accent-hover, #d4b88e);
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        text-align: center;
        font-weight: 500;
    }
    .success {
        background: #052e16;
        color: #4ade80;
        border: 1px solid #166534;
    }
    .error {
        background: #450a0a;
        color: #fca5a5;
        border: 1px solid #991b1b;
    }
</style>
