<!-- src/routes/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/translations';
    
    let books = [];
    let loading = true;
    let error = null;
    
    onMount(async () => {
        try {
            const response = await fetch('/api/books');
            if (response.ok) {
                const allBooks = await response.json();
                books = allBooks.filter(book => 
                    book && 
                    book.title && 
                    book.title.trim() !== '' && 
                    book.author && 
                    book.author.trim() !== '' &&
                    (book.coverImageId) 
                );
            } else {
                error = $t('pages.home.featured.error');
            }
        } catch (err) {
            console.error('Error fetching books:', err);
            error = $t('pages.home.featured.networkError');
        } finally {
            loading = false;
        }
    });

    // Helper function for pluralization
    function getPluralSuffix(count, lang) {
        if (lang === 'en') return count === 1 ? '' : 's';
        if (lang === 'es') return count === 1 ? '' : 's';
        if (lang === 'fr') return count === 1 ? '' : 's'; // French uses same plural for "avis"
        return count === 1 ? '' : 's';
    }
</script>

<svelte:head>
    <title>{$t('pages.home.title')}</title>
</svelte:head>

<div class="container">
    <header class="hero">
        <h1>{$t('pages.home.hero.heading')}</h1>
        <p>{$t('pages.home.hero.subtitle')}</p>
    </header>
    
    <section class="featured-books">
        <h2>{$t('pages.home.featured.heading')}</h2>
        
        {#if loading}
            <div class="loading">
                <p>{$t('pages.home.featured.loading')}</p>
            </div>
        {:else if error}
            <div class="error">
                <p>{error}</p>
            </div>
        {:else if books.length === 0}
            <div class="empty">
                <p>{$t('pages.home.featured.empty')}</p>
            </div>
        {:else}
            <div class="books-grid">
                {#each books as book}
                    <article class="book-card">
                        <a href={`/books/${book.slug}`}>
                            {#if book.coverImageId}
                                <img 
                                    src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/cover`}
                                    alt={$t('pages.home.featured.book.coverAlt', { title: book.title })}
                                    class="book-cover"
                                    loading="lazy"
                                />
                            {:else}
                                <div class="book-cover-placeholder">
                                    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#d1d5db"/>
                                        <path d="M2 17L12 22L22 17" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 12L12 17L22 12" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            {/if}
                        </a>

                        <div class="book-info">
                            <a href={`/books/${book.slug}`}>
                                <h3>{book.title}</h3>
                            </a>
                            <p class="author">{$t('pages.home.featured.book.by')} {book.author}</p>
                            {#if book.avg_rating}
                                <div class="rating">
                                    {$t('pages.home.featured.book.rating', { rating: parseFloat(book.avg_rating).toFixed(1) })}
                                    {#if book.review_count}
                                        {$t('pages.home.featured.book.reviewCount', { 
                                            count: book.review_count,
                                            plural: getPluralSuffix(book.review_count, $locale)
                                        })}
                                    {/if}
                                </div>
                            {/if}
                            <a href={`/books/${book.slug}`} class="read-more">{$t('pages.home.featured.book.readMore')}</a>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    </section>
</div>
<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .hero {
        text-align: center;
        margin-bottom: 3rem;
    }
    
    .hero h1 {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        color: #1f2937;
    }
    
    .hero p {
        font-size: 1.25rem;
        color: #6b7280;
    }
    
    .featured-books h2 {
        font-size: 2rem;
        margin-bottom: 1.5rem;
        color: #1f2937;
    }
    
    .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
    }
    
    .book-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .book-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
    
    .book-cover {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        background: #f3f4f6;
    }
    
    .book-info {
        padding: 1.5rem;
    }
    
    .book-info h3 {
        font-size: 1.25rem;
        margin: 0 0 0.5rem 0;
        color: #1f2937;
    }
    
    .book-info h3:hover {
        color: #3b82f6;
    }
    
    .author {
        color: #6b7280;
        margin: 0 0 1rem 0;
        font-size: 0.95rem;
    }
    
    .rating {
        color: #f59e0b;
        font-weight: 600;
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
    }
    
    .read-more {
        display: inline-block;
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
    }
    
    .read-more:hover {
        text-decoration: underline;
    }
    
    .loading, .error, .empty {
        text-align: center;
        padding: 3rem;
        background: #f9fafb;
        border-radius: 8px;
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
    
    @media (max-width: 768px) {
        .hero h1 {
            font-size: 2rem;
        }
        
        .books-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1.5rem;
        }
        
        .book-info {
            padding: 1rem;
        }
        
        .book-info h3 {
            font-size: 1.1rem;
        }
    }
</style>
