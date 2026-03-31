<script>
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';
    import { page } from '$app/stores';

    export let data;
    
    $: book = data.book;
    $: error = data.error;
</script>

<svelte:head>
    <title>{book ? book.title : $t('pages.bookReview.title')}</title>
</svelte:head>

<div class="container">
    {#if error}
        <div class="error">
            <p>{$t('pages.bookReview.error.message')}</p>
            <button on:click={() => goto('/')} class="btn-secondary">{$t('pages.bookReview.goHome')}</button>
        </div>
    {:else if book}
        <div class="book-detail">
            <div class="book-header">
                <h1>{book.title}</h1>
                {#if data?.user?.role === 'admin'}
                    <div class="book-actions">
                        <a href={`/admin/books/edit/${book.slug}`} class="btn-secondary">{$t('pages.bookReview.edit')}</a>
                    </div>
                {/if}
            </div> 
            <div class="book-content">
                {#if book.coverImageId}
                    <div class="book-cover">
                        <img 
                            src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/thumbnail`} 
                            alt={book.title} 
                        />
                    </div>
                {/if}
                
                <div class="book-info">
                    <p><strong>{$t('pages.bookReview.book.author')}:</strong> {book.author}</p>
                    {#if book.published_year}
                        <p><strong>{$t('pages.bookReview.book.published')}:</strong> {book.published_year}</p>
                    {/if}
                    <p><strong>{$t('pages.bookReview.book.status')}:</strong> 
                        {book.published 
                            ? $t('pages.bookReview.status.published') 
                            : $t('pages.bookReview.status.draft')}
                    </p>
                    {#if book.description}
                        <div class="book-description">
                            <h3>{$t('pages.bookReview.book.description')}</h3>
                            <p>{book.description}</p>
                        </div>
                    {/if}
                </div>
            </div>
            
            {#if book.reviews && book.reviews.length > 0}
                <div class="reviews-section">
                    <h2>{$t('pages.bookReview.reviews.heading')}</h2>
                    {#each book.reviews as review}
                        <div class="review">
                            <div class="review-header">
                                <span class="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                <span class="author">{$t('pages.bookReview.reviews.by')} {review.author_username}</span>
                                <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="review-content">
                                {review.content}
                            </div>
                            
                            {#if review.comments && review.comments.length > 0}
                                <div class="comments">
                                    <h4>{$t('pages.bookReview.reviews.comments')}</h4>
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
                    <p>{$t('pages.bookReview.reviews.noReviews')}</p>
                </div>
            {/if}
            
            <div class="back-link">
                <a href="/" class="btn-secondary">{$t('pages.bookReview.backToHome')}</a>
            </div>
        </div>
    {:else}
        <div class="error">
            <p>{$t('pages.bookReview.error.notFound')}</p>
            <button on:click={() => goto('/')} class="btn-secondary">{$t('pages.bookReview.goHome')}</button>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }
    
    .book-detail {
        color: var(--text, #e4e4e7);
    }
    
    .book-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
    }
    
    .book-header h1 {
        font-family: var(--font-heading, 'Playfair Display', serif);
        font-size: 2.5rem;
        font-weight: 400;
        color: var(--text, #e4e4e7);
        margin: 0;
    }
    
    .book-actions {
        display: flex;
        gap: 0.75rem;
    }
    
    .btn-secondary {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border, #27272a);
        border-radius: var(--radius, 8px);
        color: var(--text-dim, #a1a1aa);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-secondary:hover {
        border-color: var(--accent, #c9a87c);
        color: var(--accent, #c9a87c);
    }
    
    .book-content {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }
    
    .book-cover {
        flex-shrink: 0;
    }
    
    .book-cover img {
        width: 200px;
        height: auto;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    
    .book-info {
        flex: 1;
        min-width: 250px;
    }
    
    .book-info p {
        color: var(--text-dim, #a1a1aa);
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }
    
    .book-info p strong {
        color: var(--text, #e4e4e7);
    }
    
    .book-description {
        margin-top: 1.5rem;
    }
    
    .book-description h3 {
        font-family: var(--font-heading, 'Playfair Display', serif);
        font-weight: 400;
        color: var(--accent, #c9a87c);
        margin-bottom: 0.75rem;
    }
    
    .book-description p {
        color: var(--text-dim, #a1a1aa);
        line-height: 1.8;
    }
    
    .back-link {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border, #27272a);
    }
    
    .error {
        text-align: center;
        padding: 3rem;
        background: var(--surface, #141417);
        border-radius: 12px;
        color: var(--text-dim, #a1a1aa);
    }

    .reviews-section {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border, #27272a);
    }
    
    .review {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: var(--surface, #141417);
        border-radius: 8px;
        border: 1px solid var(--border, #27272a);
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
        color: var(--dim, #a1a1aa);
    }
    
    .date {
        color: var(--muted, #71717a);
        font-size: 0.875rem;
    }
    
    .review-content {
        color: var(--text, #e4e4e7) !important;
        line-height: 1.6;
    }
    
    .comment {
        margin-left: 2rem;
        margin-bottom: 1rem;
        padding: 1rem;
        background: var(--surface-2, #1c1c21);
        border-radius: 6px;
        border-left: 3px solid var(--border, #27272a);
    }
    
    .comment-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }
    
    .comment-content {
        color: var(--text, #e4e4e7);
    }
    
    .no-reviews {
        text-align: center;
        padding: 2rem;
        background: var(--surface, #141417);
        border-radius: 8px;
        color: var(--muted, #71717a);
    }
</style>
