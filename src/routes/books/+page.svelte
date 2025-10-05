<!-- src/routes/books/+page.svelte -->
<script>
    import { t } from '$lib/translations';

    export let data;
    
    let loading = false;
    let error = null;
    let books = data?.books || [];
    
    // If no books were provided by the server, fetch them client-side
    if (!data?.books) {
        loading = true;
        fetchBooks();
    }
    
    async function fetchBooks() {
        try {
            const response = await fetch('/api/books');
            if (response.ok) {
                books = await response.json();
            } else {
                error = $t('pages.books.error');
            }
        } catch (err) {
            console.error('Error fetching books:', err);
            error = $t('pages.books.networkError');
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>{$t('pages.books.title')}</title>
</svelte:head>

<div class="container">
    <h1>{$t('pages.books.heading')}</h1>
    
    {#if loading}
        <div class="loading-state">
            <p>{$t('pages.books.loading')}</p>
        </div>
    {:else if error}
        <div class="error-state">
            <p>{error}</p>
            <button on:click={fetchBooks} class="retry-btn">{$t('pages.books.retry')}</button>
        </div>
    {:else if books.length === 0}
        <div class="empty-state">
            <p>{$t('pages.books.empty.message')}</p>
            <a href="/" class="btn">{$t('pages.books.empty.backToHome')}</a>
        </div>
    {:else}
        <div class="books-grid">
            {#each books as book}
                <article class="book-card">
                    {#if book.coverImageId}
                        <a href={`/books/${book.slug}`}>
                            <img 
                                src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/cover`}
                                alt={$t('pages.books.book.coverAlt', { title: book.title })}
                                class="book-cover"
                            />
                        </a>
                    {:else}
                        <div class="cover-placeholder">No Cover</div>
                    {/if}
                    <div class="book-info">
                        <a href={`/books/${book.slug}`}>
                            <h2>{book.title}</h2>
                        </a>
                        <p class="author">{$t('pages.books.book.by')} {book.author}</p>
                        {#if book.avg_rating}
                            <div class="rating">
                                {$t('pages.books.book.rating', {
                                    rating: parseFloat(book.avg_rating).toFixed(1),
                                    count: book.review_count || 0
                                })}
                            </div>
                        {/if}
                        <a href={`/books/${book.slug}`} class="btn">{$t('pages.books.book.readReviews')}</a>
                    </div>
                </article>
            {/each}
        </div>
    {/if}
</div>

<style>
    /* Your existing styles — no changes needed */
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
    }
    
    .book-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        transition: transform 0.2s ease;
    }
    
    .book-card:hover {
        transform: translateY(-4px);
    }
    
    .book-cover {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
    }
    
    .cover-placeholder {
        width: 100%;
        aspect-ratio: 2/3;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
    }
    
    .book-info {
        padding: 1rem;
    }
    
    .book-info h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
    }
    
    .author {
        color: #666;
        margin: 0 0 0.5rem 0;
    }
    
    .rating {
        color: #eab308;
        font-weight: 600;
        margin: 0 0 1rem 0;
    }
    
    .btn {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
    }
    
    .btn:hover {
        background: #2563eb;
    }
    
    .loading-state, .error-state, .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        background: #f9fafb;
        border-radius: 12px;
        margin: 2rem 0;
    }
    
    .error-state {
        background: #fef2f2;
        color: #b91c1c;
    }
    
    .retry-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 1rem;
        font-weight: 500;
    }
    
    .retry-btn:hover {
        background: #2563eb;
    }
    
    .empty-state {
        background: #f0f9ff;
        color: #0369a1;
    }
    
    .empty-state .btn {
        margin-top: 1rem;
    }
</style>
