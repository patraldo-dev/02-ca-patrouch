<!-- src/routes/admin/reviews/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let data; // Get data from +page.server.js
    
    let reviews = [];
    let loading = true;
    let error = null;
    
    // Check if user is admin
    $: isAdmin = data?.user?.role === 'admin' || data?.user?.is_admin;
    
    onMount(async () => {
        try {
            const response = await fetch('/api/admin/reviews');
            if (response.ok) {
                reviews = await response.json();
            } else {
                error = 'Failed to load reviews';
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
            error = 'Network error. Please try again.';
        } finally {
            loading = false;
        }
    });
    
    async function deleteReview(reviewId) {
        if (!isAdmin) {
            alert('You must be an admin to delete reviews');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this review?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                reviews = reviews.filter(r => r.id !== reviewId);
            } else {
                alert('Failed to delete review');
            }
        } catch (err) {
            console.error('Error deleting review:', err);
            alert('Failed to delete review');
        }
    }
</script>

<svelte:head>
    <title>Reviews — Ex Libris</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <div>
            <h1>Book Reviews</h1>
            <p>Discover what our community is reading and their thoughts on the latest books</p>
        </div>
        {#if isAdmin}
            <a href="/admin/reviews/add" class="btn-primary">Add Review</a>
        {/if}
    </div>
    
    {#if loading}
        <div class="loading">
            <p>Loading reviews...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if reviews.length === 0}
        <div class="empty">
            <p>No reviews available yet. Be the first to share your thoughts!</p>
            <a href="/books" class="btn">Browse Books</a>
        </div>
    {:else}
        <div class="reviews-grid">
            {#each reviews as review}
                <article class="review-card">
                    <div class="review-header">
                        <div class="book-info">
                            <h3>{review.book_title}</h3>
                            <div class="rating">⭐ {review.rating}</div>
                        </div>
                        {#if isAdmin}
                            <button 
                                aria-label="Delete review"
                                class="delete-btn" 
                                on:click={() => deleteReview(review.id)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        {/if}
                    </div>
                    
                    <div class="review-meta">
                        <span class="reviewer">By {review.reviewer_name}</span>
                        <span class="date">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="review-content">
                        {review.content}
                    </div>
                    
                    <div class="review-actions">
                        <a href={`/books/${review.book_slug}`} class="view-book-btn">
                            View Book Details →
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
    
    .delete-btn {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: background-color 0.2s;
        flex-shrink: 0;
    }
    
    .delete-btn:hover {
        background: rgba(239, 68, 68, 0.1);
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
