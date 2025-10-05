<!-- src/routes/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { t, locale } from '$lib/translations';
    
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
        if (lang === 'fr') return count === 1 ? '' : 's';
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
                    {@const currentLocale = $locale}
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
                                            plural: getPluralSuffix(book.review_count, currentLocale)
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
