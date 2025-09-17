<!-- src/routes/books/[id]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>{data.book.title} — My Book Reviews</title>
</svelte:head>

<div class="container">
    <a href="/" class="back-btn">← Back to Books</a>
    <div class="book-header">
        {#if data.book.cover_image_url}
            <img src={data.book.cover_image_url} alt={data.book.title} class="cover-large" />
        {/if}
        <div class="book-meta">
            <h1>{data.book.title}</h1>
            <h2>by {data.book.author}</h2>
            {#if data.book.published_year}
                <p>Published: {data.book.published_year}</p>
            {/if}
            {#if data.book.description}
                <p class="description">{data.book.description}</p>
            {/if}
        </div>
    </div>

    <!-- Write Review Button -->
    {#if data.user}
        <div class="action-bar">
            <a href="/books/{data.book.id}/review" class="btn-primary">Write a Review</a>
        </div>
    {/if}

    <div class="reviews-section">
        <h2>Reviews ({data.book.reviews.length})</h2>
        {#each data.book.reviews as review}
            <div class="review">
                <div class="review-header">
                    <strong>{review.author_username}</strong>
                    <span class="rating">⭐ {review.rating}</span>
                    <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-content">
                    {review.content}
                </div>
                {#if review.comments.length}
                    <div class="comments">
                        <h4>Comments:</h4>
                        {#each review.comments as comment}
                            <div class="comment">
                                <strong>{comment.author_username}</strong> — {new Date(comment.created_at).toLocaleDateString()}
                                <p>{comment.content}</p>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    /* ... your existing styles ... */

    .action-bar {
        margin: 2rem 0;
        text-align: center;
    }

    .btn-primary {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
    }

    .btn-primary:hover {
        background: #2563eb;
    }
</style>
