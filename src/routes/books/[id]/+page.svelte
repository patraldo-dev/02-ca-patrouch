<!-- src/routes/books/[id]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;

    // Function to handle new comment
    function handleCommentPosted(reviewId, newComment) {
        const review = data.book.reviews.find(r => r.id === reviewId);
        if (review) {
            review.comments = [...(review.comments || []), newComment];
        }
    }
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

                <!-- Comment Form (if logged in) -->
                {#if $page.data.user}
                    <svelte:component this={import('$lib/components/CommentForm.svelte')}
                        reviewId={review.id}
                        onCommentPosted={(newComment) => handleCommentPosted(review.id, newComment)}
                    />
                {/if}

                <!-- Comments -->
                {#if review.comments && review.comments.length > 0}
                    <div class="comments-section">
                        <h4>Comments ({review.comments.length})</h4>
                        {#each review.comments as comment}
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>{comment.user.username}</strong>
                                    <span class="date">{new Date(comment.created_at).toLocaleDateString()}</span>
                                </div>
                                <div class="comment-content">
                                    {comment.content}
                                </div>
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
        font-weight: 500;
    }
    .book-header {
        display: flex;
        gap: 2rem;
        margin-bottom: 3rem;
        align-items: flex-start;
    }
    .cover-large {
        width: 200px;
        height: auto;
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

    /* Comments Section */
    .comments-section {
        margin: 1.5rem 0 0 0;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
    }
    .comments-section h4 {
        margin: 0 0 1rem 0;
        color: #555;
        font-size: 1.1rem;
    }
    .comment {
        background: white;
        padding: 1rem;
        border-radius: 6px;
        margin: 0.5rem 0;
        border-left: 3px solid #3b82f6;
    }
    .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .comment-header strong {
        color: #3b82f6;
    }
    .comment-content {
        line-height: 1.5;
        color: #555;
    }
</style>
