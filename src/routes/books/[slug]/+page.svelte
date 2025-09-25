<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    
    /** @type {import('./$types').PageData} */
    export let data;
    
    // State for client-side fetching (if needed)
    let book = data?.book || null;
    let loading = !data?.book;
    let error = null;
    
    // Function to handle new comment
    function handleCommentPosted(reviewId, newComment) {
        const review = book.reviews.find(r => r.id === reviewId);
        if (review) {
            review.comments = [...(review.comments || []), newComment];
        }
    }
    
    // Client-side fetching if book data isn't available
    onMount(async () => {
        if (!data?.book) {
            try {
                // Get the slug from page parameters
                const slug = $page.params.slug;
                
                if (!slug) {
                    error = 'Book slug is missing';
                    loading = false;
                    return;
                }
                
                const response = await fetch(`/api/books/${slug}`);
                
                if (response.ok) {
                    book = await response.json();
                } else {
                    error = 'Book not found';
                }
            } catch (err) {
                console.error('Error fetching book:', err);
                error = 'Failed to load book details';
            } finally {
                loading = false;
            }
        }
    });
</script>

<svelte:head>
    <title>{book?.title || 'Book Details'} — My Book Reviews</title>
</svelte:head>

<div class="container">
    <a href="/" class="back-btn">← Back to Books</a>
    
    {#if loading}
        <div class="loading">
            <p>Loading book details...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
            <a href="/">← Back to all books</a>
        </div>
    {:else if book}
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
            <h2>Reviews ({book.reviews ? book.reviews.length : 0})</h2>
            
            {#if book.reviews && book.reviews.length > 0}
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
            {:else}
                <p>No reviews yet. Be the first to review this book!</p>
            {/if}
        </div>
    {:else}
        <div class="error">
            <p>Book details not available</p>
            <a href="/">← Back to all books</a>
        </div>
    {/if}
</div>

<style>
    .loading, .error {
        padding: 2rem;
        text-align: center;
        background: #f8f9fa;
        border-radius: 8px;
        margin: 2rem 0;
    }
    
    .error {
        background: #fff5f5;
        color: #c53030;
    }
    
    .book-header {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
    }
    
    .cover-large {
        max-width: 200px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .book-meta {
        flex: 1;
    }
    
    .book-meta h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    
    .book-meta h2 {
        font-size: 1.2rem;
        color: #666;
        margin-bottom: 1rem;
    }
    
    .description {
        margin-top: 1rem;
        line-height: 1.6;
    }
    
    .reviews-section {
        margin-top: 3rem;
    }
    
    .review {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .rating {
        color: #f59e0b;
    }
    
    .date {
        color: #6b7280;
        font-size: 0.9rem;
    }
    
    .review-content {
        line-height: 1.6;
        margin-bottom: 1rem;
    }
    
    .comments-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .comment {
        background: #f9fafb;
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .comment-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }
    
    .comment-content {
        line-height: 1.5;
    }
    
    @media (max-width: 768px) {
        .book-header {
            flex-direction: column;
        }
        
        .cover-large {
            max-width: 150px;
            align-self: center;
        }
    }
</style>
