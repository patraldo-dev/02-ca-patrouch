<script>
    import { goto } from '$app/navigation';
    import { t } from '$lib/translations'; // ← import t as in NewsletterForm
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
