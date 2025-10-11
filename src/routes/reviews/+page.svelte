<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/translations';

    let reviews = [];
    let loading = true;
    let error = null;
    
    onMount(async () => {
        try {
            const response = await fetch('/api/reviews');
            if (response.ok) {
                reviews = await response.json();
            } else {
                error = $t('pages.reviews.error'); // Use generic error
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
            error = $t('pages.reviews.networkError');
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head>
    <title>{$t('pages.reviews.title')}</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <h1>{$t('pages.reviews.heading')}</h1>
        <p>{$t('pages.reviews.subtitle')}</p>
    </div>
    
    {#if loading}
        <div class="loading">
            <p>{$t('pages.reviews.loading')}</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if reviews.length === 0}
        <div class="empty">
            <p>{$t('pages.reviews.empty.message')}</p>
            <a href="/books" class="btn">{$t('pages.reviews.empty.browseBooks')}</a>
        </div>
    {:else}
        <div class="reviews-grid">
            {#each reviews as review}
                <article class="review-card">
                    <div class="review-header">
                        <div class="book-info">
                            <h3>{review.book_title}</h3>
<div class="rating">
  {$t('pages.reviews.rating', { rating: review.rating })}
</div>
                        <div class="review-meta">
                            <span class="reviewer">{$t('pages.reviews.review.by')} {review.reviewer_name}</span>
                            <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="review-content">
                        {review.content}
                    </div>
                    
                    <div class="review-actions">
                        <a href={`/books/${review.book_slug}`} class="view-book-btn">
                            {$t('pages.reviews.review.viewBook')}
                        </a>
                    </div>
                </article>
            {/each}
        </div>
    {/if}
</div>
<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .page-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    
    .page-header h1 {
        font-size: 2.5rem;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
    }
    
    .page-header p {
        font-size: 1.125rem;
        color: #6b7280;
        margin: 0;
    }
    
    .loading, .error, .empty {
        text-align: center;
        padding: 3rem;
        background: #f9fafb;
        border-radius: 12px;
        margin: 2rem 0;
    }
    
    .error {
        background: #fef2f2;
        color: #b91c1c;
    }
    
    .empty {
        background: #f0f9ff;
        color: #0369a1;
    }
    
    .empty .btn {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: var(--primary-color);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
    
    .empty .btn:hover {
        background: var(--primary-dark);
    }
    
    .reviews-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
    }
    
    .review-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        padding: 1.5rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
    }
    
    .review-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }
    
    .book-info h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
    }
    
    .rating {
        color: #f59e0b;
        font-weight: 600;
        font-size: 1rem;
    }
    
    .review-meta {
        display: flex;
        gap: 1rem;
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .review-content {
        line-height: 1.6;
        color: #374151;
        margin-bottom: 1.5rem;
    }
    
    .review-actions {
        display: flex;
        justify-content: flex-end;
    }
    
    .view-book-btn {
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.875rem;
        transition: color 0.2s ease;
    }
    
    .view-book-btn:hover {
        color: var(--primary-dark);
        text-decoration: underline;
    }
    
    @media (max-width: 768px) {
        .container {
            padding: 1rem;
        }
        
        .page-header h1 {
            font-size: 2rem;
        }
        
        .reviews-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
        
        .review-header {
            align-items: center;
        }
    }
</style>
