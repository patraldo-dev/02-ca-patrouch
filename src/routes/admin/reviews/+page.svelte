<!-- src/routes/admin/reviews/+page.svelte -->
<script>
    let reviews = [];
    let error = '';

    async function loadReviews() {
        try {
            const res = await fetch('/api/admin/reviews');
            reviews = await res.json();
        } catch (err) {
            error = 'Failed to load reviews';
        }
    }

    loadReviews();
</script>

<svelte:head>
    <title>Manage Reviews — Admin</title>
</svelte:head>

<div class="container">
    <h1>📚 Manage Reviews</h1>
    
    {#if error}
        <div class="alert error">{error}</div>
    {/if}

    <div class="actions">
        <a href="/admin/reviews/add" class="btn-primary">➕ Add New Review</a>
    </div>

    {#if reviews.length === 0}
        <p>No reviews found. Add your first review!</p>
    {:else}
        <div class="reviews-list">
            {#each reviews as review}
                <div class="review-card">
                    <div class="review-header">
                        <strong>{review.username}</strong> on <em>"{review.title}"</em>
                        <span class="rating">⭐ {review.rating}</span>
                    </div>
                    <div class="review-content">
                        {review.content}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    h1 {
        color: #333;
        margin-bottom: 2rem;
    }
    .actions {
        margin-bottom: 2rem;
        text-align: right;
    }
    .btn-primary {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
    .reviews-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .review-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 1rem;
    }
    .review-header strong {
        color: #333;
    }
    .review-header em {
        color: #666;
    }
    .rating {
        color: #eab308;
        font-weight: 600;
    }
    .review-content {
        margin: 1rem 0;
        line-height: 1.6;
        color: #555;
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
    }
</style>
