<!-- src/routes/+page.svelte -->
<script>
    import { t } from '$lib/translations';
    
    export let data;
    $: books = data?.books || [];
    $: user = data?.user || null;
    
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
        <div class="hero-content">
            <h1>{$t('pages.home.hero.heading')}</h1>
            <p class="hero-subtitle">{$t('pages.home.hero.subtitle')}</p>
            <div class="hero-cta">
                <a href="/books" class="btn-primary">{$t('pages.home.hero.exploreBooks')}</a>
                <a href="/about" class="btn-secondary">{$t('pages.home.hero.learnMore')}</a>
            </div>
        </div>
        <div class="hero-decoration"></div>
    </header>
    
    <section class="featured-books">
        <div class="section-header">
            <h2>{$t('pages.home.featured.heading')}</h2>
            <div class="section-divider"></div>
        </div>
        
        {#if books.length === 0}
            <div class="empty-state">
                <div class="empty-content">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>{$t('pages.home.featured.empty')}</p>
                </div>
            </div>
        {:else}
            <div class="books-grid">
                {#each books as book}
                    <article class="book-card">
                        <a href={`/books/${book.slug}`} class="book-link">
                            {#if book.coverImageId}
                                <div class="book-cover-wrapper">
                                    <img 
                                        src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/cover`}
                                        alt={$t('pages.home.featured.book.coverAlt', { title: book.title })}
                                        class="book-cover"
                                        loading="lazy"
                                    />
                                    <div class="book-overlay"></div>
                                </div>
                            {:else}
                                <div class="book-cover-placeholder">
                                    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#e5e7eb"/>
                                        <path d="M2 17L12 22L22 17" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 12L12 17L22 12" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            {/if}
                            
                            <div class="book-info">
                                <a href={`/books/${book.slug}`} class="book-title-link">
                                    <h3>{book.title}</h3>
                                </a>
                                <p class="book-author">{$t('pages.home.featured.book.by')} {book.author}</p>
                                {#if book.avg_rating}
                                    <div class="book-rating">
                                        <span class="rating-stars">⭐ {parseFloat(book.avg_rating).toFixed(1)}</span>
                                        {#if book.review_count}
                                            <span class="rating-count">
                                                {$t('pages.home.featured.book.reviewCount', { 
                                                    count: book.review_count,
                                                    plural: getPluralSuffix(book.review_count, $locale)
                                                })}
                                            </span>
                                        {/if}
                                    </div>
                                {/if}
                                <a href={`/books/${book.slug}`} class="read-more-btn">
                                    {$t('pages.home.featured.book.readMore')}
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </a>
                            </div>
                        </a>
                    </article>
                {/each}
            </div>
        {/if}
    </section>
</div>

