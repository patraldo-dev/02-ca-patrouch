<script>
    import { onMount } from 'svelte';
    import { t, getLocale } from '$lib/i18n';

    let reviews = [];
    let loading = true;
    let error = null;

    function ratingText(review) {
        const loc = getLocale();
        const templates = {
            en: (r, c) => c === 1 ? `⭐ ${r} (${c} review)` : `⭐ ${r} (${c} reviews)`,
            es: (r, c) => c === 1 ? `⭐ ${r} (${c} reseña)` : `⭐ ${r} (${c} reseñas)`,
            fr: (r, c) => `⭐ ${r} (${c} avis)`
        };
        return (templates[loc] || templates.en)(review.rating, review.review_count);
    }
    
    onMount(async () => {
        try {
            const response = await fetch('/api/reviews');
            if (response.ok) {
                reviews = await response.json();
            } else {
                error = $t('pages.reviews.error');
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
        <p class="subtitle">{$t('pages.reviews.subtitle')}</p>
    </div>
    
    {#if loading}
        <div class="state-box">
            <p>{$t('pages.reviews.loading')}</p>
        </div>
    {:else if error}
        <div class="state-box error">
            <p>{error}</p>
        </div>
    {:else if reviews.length === 0}
        <div class="state-box empty">
            <p>{$t('pages.reviews.empty.message')}</p>
            <a href="/books" class="btn-accent">{$t('pages.reviews.empty.browseBooks')}</a>
        </div>
    {:else}
        <div class="reviews-grid">
            {#each reviews as review}
                <article class="review-card">
                    <div class="review-header">
                        <h3>{review.book_title}</h3>
                        <div class="rating">{ratingText(review)}</div>
                    </div>
                    <div class="review-meta">
                        <span class="reviewer">{$t('pages.reviews.review.by')} {review.reviewer_name}</span>
                        <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
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
        margin: 0 0 0.5rem 0;
    }
    
    .subtitle {
        color: var(--text-dim);
        font-size: 1.125rem;
    }
    
    .state-box {
        text-align: center;
        padding: 3rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        margin: 2rem 0;
        color: var(--text-dim);
    }

    .state-box.error {
        background: rgba(185, 28, 28, 0.1);
        border-color: rgba(185, 28, 28, 0.3);
        color: #fca5a5;
    }

    .state-box.empty {
        background: rgba(3, 105, 161, 0.1);
        border-color: rgba(3, 105, 161, 0.3);
        color: var(--text-dim);
    }

    .state-box .btn-accent {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        text-decoration: none;
        border-radius: var(--radius);
        font-weight: 600;
    }

    .reviews-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
    }
    
    .review-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        transition: transform 0.2s ease, border-color 0.3s ease;
    }
    
    .review-card:hover {
        transform: translateY(-2px);
        border-color: rgba(201, 168, 124, 0.3);
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }
    
    .review-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text, #e4e4e7) !important;
        margin: 0;
    }
    
    .rating {
        color: #f59e0b;
        font-weight: 600;
        font-size: 0.95rem;
        white-space: nowrap;
    }
    
    .review-meta {
        display: flex;
        gap: 1rem;
        color: var(--text-muted, #71717a) !important;
        font-size: 0.875rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border, #27272a);
    }
    
    .review-content {
        line-height: 1.6;
        color: var(--text-dim, #a1a1aa) !important;
        margin-bottom: 1.5rem;
    }
    
    .review-actions {
        display: flex;
        justify-content: flex-end;
    }
    
    .view-book-btn {
        color: var(--accent);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.875rem;
        transition: color 0.2s ease;
    }
    
    .view-book-btn:hover {
        color: var(--accent-hover);
        text-decoration: underline;
    }
    
    @media (max-width: 768px) {
        .container { padding: 1rem; }
        .reviews-grid { grid-template-columns: 1fr; gap: 1.5rem; }
        .review-header { flex-direction: column; gap: 0.5rem; }
    }
</style>
