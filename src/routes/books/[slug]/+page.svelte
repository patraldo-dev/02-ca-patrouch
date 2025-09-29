<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    
    export let data;
    
    $: book = data.book;
    $: error = data.error;
    
    // Log for debugging
    $: console.log('Book data from load function:', book);
</script>

<svelte:head>
    <title>{book ? book.title : 'Book Details'}</title>
</svelte:head>

<div class="container">
    {#if error}
        <div class="error">
            <p>{error.message}</p>
            <button on:click={() => goto('/')} class="btn-secondary">Go Home</button>
        </div>
    {:else if book}
        <div class="book-detail">
           <div class="book-header">
    <h1>{book.title}</h1>
    {#if data?.user?.role === 'admin'}
        <div class="book-actions">
            <a href={`/admin/books/edit/${book.slug}`} class="btn-secondary">Edit</a>
        </div>
    {/if}
</div> 
            <div class="book-content">
                {#if book.coverImageId}
                    <div class="book-cover">
                        <img src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/gallery`} alt={book.title} />
                    </div>
                {/if}
                
                <div class="book-info">
                    <p><strong>Author:</strong> {book.author}</p>
                    {#if book.published_year}
                        <p><strong>Published:</strong> {book.published_year}</p>
                    {/if}
                    <p><strong>Status:</strong> {book.published ? 'Published' : 'Draft'}</p>
                    {#if book.description}
                        <div class="book-description">
                            <h3>Description</h3>
                            <p>{book.description}</p>
                        </div>
                    {/if}
                </div>
            </div>
            
            {#if book.reviews && book.reviews.length > 0}
                <div class="reviews-section">
                    <h2>Reviews</h2>
                    {#each book.reviews as review}
                        <div class="review">
                            <div class="review-header">
                                <span class="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                <span class="author">by {review.author_username}</span>
                                <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="review-content">
                                {review.content}
                            </div>
                            
                            {#if review.comments && review.comments.length > 0}
                                <div class="comments">
                                    <h4>Comments</h4>
                                    {#each review.comments as comment}
                                        <div class="comment">
                                            <div class="comment-header">
                                                <span class="author">{comment.user.username}</span>
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
            {:else}
                <div class="no-reviews">
                    <p>No reviews yet. Be the first to review this book!</p>
                </div>
            {/if}
            
            <div class="back-link">
                <a href="/" class="btn-secondary">Back to Home</a>
            </div>
        </div>
    {:else}
        <div class="error">
            <p>Book not found</p>
            <button on:click={() => goto('/')} class="btn-secondary">Go Home</button>
        </div>
    {/if}
</div>

<style>
    
    .reviews-section {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .review {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .rating {
        color: #f59e0b;
    }
    
    .author {
        font-weight: 600;
        color: #4b5563;
    }
    
    .date {
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    .comment {
        margin-left: 2rem;
        margin-bottom: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #e5e7eb;
    }
    
    .comment-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }
    
    .no-reviews {
        text-align: center;
        padding: 2rem;
        background: #f9fafb;
        border-radius: 8px;
        color: #6b7280;
    }
</style>
