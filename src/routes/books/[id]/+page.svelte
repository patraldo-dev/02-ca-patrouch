<!-- src/routes/books/[id]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
    const { book } = data;
</script>

<svelte:head>
    <title>{book.title} — My Book Reviews</title>
</svelte:head>

<div class="container">
    <a href="/" class="back-btn">← Back to Books</a>
    <div class="book-header">
        {#if book.cover_image_url}
            <img src={book.cover_image_url} alt={book.title} class="cover-large" />
        {/if}
        <div class="book-meta">
            <h1>{book.title}</h1>
            <h2>by {book.author}</h2>
            {#if book.published_year}
                <p>Published: {book.published_year}</p>
            {/if}
            {#if book.description}
                <p class="description">{book.description}</p>
            {/if}
        </div>
    </div>

    <div class="reviews-section">
        <h2>Reviews ({book.reviews.length})</h2>
        {#each book.reviews as review}
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
    .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
    }
    .back-btn {
        display: inline-block;
        margin-bottom: 2rem;
        color: #3b82f6;
        text-decoration: none;
    }
    .book-header {
        display: flex;
        gap: 2rem;
        margin-bottom: 3rem;
        align-items: flex-start;
    }
    .cover-large {
        width: 200px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .book-meta h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
    }
    .book-meta h2 {
        margin: 0 0 1rem 0;
        color: #555;
    }
    .description {
        line-height: 1.6;
        color: #333;
    }
    .reviews-section h2 {
        border-bottom: 2px solid #eee;
        padding-bottom: 0.5rem;
        margin-bottom: 1.5rem;
    }
    .review {
        background: #fafafa;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
        border-left: 4px solid #3b82f6;
    }
    .review-header {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        align-items: center;
    }
    .rating {
        color: #eab308;
        font-weight: 600;
    }
    .date {
        color: #888;
        font-size: 0.9rem;
    }
    .review-content {
        margin-bottom: 1rem;
        line-height: 1.6;
    }
    .comments h4 {
        margin: 1rem 0 0.5rem 0;
        color: #555;
    }
    .comment {
        background: #fff;
        padding: 1rem;
        border-radius: 6px;
        margin: 0.5rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .comment strong {
        color: #3b82f6;
    }
    .comment p {
        margin: 0.25rem 0 0 0;
    }
</style>
