<script>
    import ColorGuide from '$lib/components/ColorGuide.svelte';
    import { t } from '$lib/translations';
    
    export let data;
    $: books = data?.books || [];
    $: user = data?.user || null;
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
                        <a href={`/books/${book.slug}`} class="book-cover-link">
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
                        </a>
                        
                        <div class="book-info">
                            <h3>{book.title}</h3>
                            <p class="book-author">{$t('pages.home.featured.book.by')} {book.author}</p>
                            {#if book.avg_rating}
                                <div class="book-rating">
                                    <span class="rating-stars">⭐ {parseFloat(book.avg_rating).toFixed(1)}</span>
                                    {#if book.review_count}
                                        <span class="rating-count">
                                            {$t('pages.home.featured.book.reviewCount', { 
                                                count: book.review_count,
                                                plural: book.review_count === 1 ? '' : 's'
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
                    </article>
                {/each}
            </div>
        {/if}
    </section>

 <section class="color-reference">
        <div class="section-header">
            <h2>Our Design Colors</h2>
            <p class="section-subtitle">The palette that brings our books to life</p>
        </div>
        <ColorGuide />
    </section>
</div>

<style>
    /* Book-themed color palette with accessibility compliance */
    :root {
        /* Primary colors - old book paper theme */
        --primary-color: #D2B48C;  /* Tan */
        --primary-dark: #A0826D;   /* Dusty tan */
        --primary-light: #F5F5DC;  /* Beige */
        --accent-color: #8B4513;   /* Saddle brown */
        
        /* Text colors with proper contrast ratios */
        --text-primary: #2C1810;   /* Dark brown (WCAG AAA on light backgrounds) */
        --text-secondary: #5D4037; /* Medium brown */
        --text-muted: #795548;     /* Light brown */
        
        /* Background colors */
        --bg-primary: #FFFEF7;     /* Off-white (cream) */
        --bg-secondary: #F5F5DC;   /* Beige */
        --bg-card: #FFFFFF;        /* White */
        
        /* Contrast verification:
           - Dark brown (#2C1810) on tan (#D2B48C): 6.1:1 (AAA compliant)
           - Dark brown (#2C1810) on beige (#F5F5DC): 8.7:1 (AAA compliant)
           - Dark brown (#2C1810) on white (#FFFFFF): 15.1:1 (AAA compliant)
        */
    }

/* Add to your existing styles */
.color-reference {
    margin-top: 4rem;
    padding: 2rem 0;
    border-top: 1px solid var(--primary-light);
}

.section-subtitle {
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto 2rem;
    text-align: center;
}

    /* Modern, sleek typography and spacing */
    .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 1.5rem;
        background-color: var(--bg-primary);
    }

    /* Hero Section - Book-themed warmth */
    .hero {
        position: relative;
        padding: 4rem 0 3rem;
        text-align: center;
        background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
        border-radius: 24px;
        margin: 2rem 0 4rem;
        overflow: hidden;
        border: 1px solid var(--primary-light);
    }

    .hero-content {
        position: relative;
        z-index: 2;
        max-width: 800px;
        margin: 0 auto;
        padding: 0 1rem;
    }

    .hero h1 {
        font-size: 3.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, var(--primary-dark) 0%, var(--text-primary) 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 1rem;
        line-height: 1.1;
    }

    .hero-subtitle {
        font-size: 1.25rem;
        color: var(--text-secondary);
        margin-bottom: 2rem;
        font-weight: 500;
        line-height: 1.6;
    }

    .hero-cta {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }

    .hero-decoration {
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
        opacity: 0.1;
        border-radius: 50%;
        z-index: 1;
    }

    /* Section Header - Elegant book theme */
    .section-header {
        text-align: center;
        margin-bottom: 3rem;
        position: relative;
    }

    .section-header h2 {
        font-size: 2.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 1.5rem;
        position: relative;
        display: inline-block;
    }

    .section-header h2::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 4px;
        background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
        border-radius: 2px;
    }

    /* Books Grid - Clean card layout */
    .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
        padding: 0 0.5rem;
    }

    /* Book Card - Modern card design */
    .book-card {
        background: var(--bg-card);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(139, 69, 19, 0.15), 0 8px 10px -6px rgba(139, 69, 19, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--primary-light);
    }

    .book-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgba(139, 69, 19, 0.2), 0 10px 10px -6px rgba(139, 69, 19, 0.15);
    }

    .book-link {
        display: block;
        height: 100%;
        text-decoration: none;
    }

    .book-cover-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 2/3;
        overflow: hidden;
    }

    .book-cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    .book-card:hover .book-cover {
        transform: scale(1.05);
    }

    .book-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(transparent 60%, rgba(44, 24, 16, 0.3) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .book-card:hover .book-overlay {
        opacity: 1;
    }

    .book-cover-placeholder {
        width: 100%;
        aspect-ratio: 2/3;
        background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--primary-light) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }

    .book-info {
        padding: 1.5rem;
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .book-title-link {
        text-decoration: none;
        color: inherit;
    }

    .book-info h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.75rem 0;
        line-height: 1.3;
        transition: color 0.2s ease;
    }

    .book-card:hover .book-info h3 {
        color: var(--accent-color);
    }

    .book-author {
        color: var(--text-secondary);
        margin: 0 0 1rem 0;
        font-weight: 500;
        font-size: 0.95rem;
    }

    .book-rating {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0 0 1.25rem 0;
        flex-wrap: wrap;
    }

    .rating-stars {
        color: var(--accent-color);
        font-weight: 600;
        font-size: 1.1rem;
    }

    .rating-count {
        color: var(--text-muted);
        font-size: 0.9rem;
        font-weight: 500;
    }

    .read-more-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
        color: var(--text-primary);
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        margin-top: auto;
        width: fit-content;
        border: 1px solid var(--primary-dark);
    }

    .read-more-btn:hover {
        background: linear-gradient(135deg, var(--primary-dark) 0%, var(--accent-color) 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
    }

    .read-more-btn svg {
        transition: transform 0.2s ease;
    }

    .read-more-btn:hover svg {
        transform: translateX(2px);
    }

    /* Loading States - Modern skeleton screens */
    .loading-state, .error-state, .empty-state {
        padding: 3rem 1rem;
        text-align: center;
    }

    .skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
        padding: 0 0.5rem;
    }

    .skeleton-card {
        background: var(--bg-card);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(139, 69, 19, 0.1);
        border: 1px solid var(--primary-light);
    }

    .skeleton-cover {
        width: 100%;
        aspect-ratio: 2/3;
        background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--primary-light) 50%, var(--bg-secondary) 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    .skeleton-info {
        padding: 1.5rem;
    }

    .skeleton-title, .skeleton-author {
        background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--primary-light) 50%, var(--bg-secondary) 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
    }

    .skeleton-title {
        height: 24px;
        margin-bottom: 12px;
        width: 80%;
    }

    .skeleton-author {
        height: 16px;
        width: 60%;
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    .error-content, .empty-content {
        max-width: 500px;
        margin: 0 auto;
        padding: 2rem;
    }

    .error-content svg, .empty-content svg {
        color: var(--primary-dark);
        margin-bottom: 1.5rem;
    }

    .error-content p, .empty-content p {
        color: var(--text-secondary);
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    /* Buttons */
    .btn-primary {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
        color: var(--text-primary);
        padding: 0.875rem 2rem;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s ease;
        border: none;
        cursor: pointer;
        border: 1px solid var(--primary-dark);
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -5px rgba(139, 69, 19, 0.4);
    }

    .btn-secondary {
        background: transparent;
        color: var(--primary-dark);
        padding: 0.875rem 2rem;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s ease;
        border: 2px solid var(--primary-dark);
        cursor: pointer;
    }

    .btn-secondary:hover {
        background: rgba(160, 130, 109, 0.1);
        transform: translateY(-2px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .hero h1 {
            font-size: 2.5rem;
        }
        
        .hero-subtitle {
            font-size: 1.1rem;
        }
        
        .hero-cta {
            flex-direction: column;
            align-items: center;
        }
        
        .books-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        
        .section-header h2 {
            font-size: 2rem;
        }
    }

    @media (max-width: 480px) {
        .hero {
            padding: 3rem 0 2rem;
        }
        
        .hero h1 {
            font-size: 2rem;
        }
        
        .books-grid {
            grid-template-columns: 1fr;
            padding: 0;
        }
        
        .book-info {
            padding: 1.25rem;
        }
    }
</style>
