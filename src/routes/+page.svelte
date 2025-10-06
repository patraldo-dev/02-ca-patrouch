<!-- src/routes/+page.svelte -->
<script>
    import { t } from '$lib/translations';
    
    // ✅ Get data from +page.server.js — no fetch needed!
    export let data;
    
    $: books = data?.books || [];
    $: user = data?.user || null;
    
    // ✅ Helper function for pluralization (no async needed)
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
                <a href="/books" class="btn-primary">Explore Books</a>
                <a href="/about" class="btn-secondary">Learn More</a>
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
                    <!-- ... same book card markup as before ... -->
                {/each}
            </div>
        {/if}
    </section>
</div>

<style>
    /* Modern, sleek typography and spacing */
    .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 1.5rem;
    }

    /* Hero Section - Bold and inviting */
    .hero {
        position: relative;
        padding: 4rem 0 3rem;
        text-align: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 24px;
        margin: 2rem 0 4rem;
        overflow: hidden;
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
        background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 1rem;
        line-height: 1.1;
    }

    .hero-subtitle {
        font-size: 1.25rem;
        color: #475569;
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
        background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
        opacity: 0.1;
        border-radius: 50%;
        z-index: 1;
    }

    /* Section Header - Elegant and clean */
    .section-header {
        text-align: center;
        margin-bottom: 3rem;
        position: relative;
    }

    .section-header h2 {
        font-size: 2.25rem;
        font-weight: 700;
        color: #1e293b;
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
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
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
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .book-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -6px rgba(0, 0, 0, 0.1);
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
        background: linear-gradient(transparent 60%, rgba(0, 0, 0, 0.2) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .book-card:hover .book-overlay {
        opacity: 1;
    }

    .book-cover-placeholder {
        width: 100%;
        aspect-ratio: 2/3;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
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
        color: #1e293b;
        margin: 0 0 0.75rem 0;
        line-height: 1.3;
        transition: color 0.2s ease;
    }

    .book-card:hover .book-info h3 {
        color: #3b82f6;
    }

    .book-author {
        color: #64748b;
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
        color: #f59e0b;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .rating-count {
        color: #64748b;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .read-more-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        margin-top: auto;
        width: fit-content;
    }

    .read-more-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .skeleton-cover {
        width: 100%;
        aspect-ratio: 2/3;
        background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    .skeleton-info {
        padding: 1.5rem;
    }

    .skeleton-title, .skeleton-author {
        background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
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
        color: #64748b;
        margin-bottom: 1.5rem;
    }

    .error-content p, .empty-content p {
        color: #475569;
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    /* Buttons */
    .btn-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 0.875rem 2rem;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s ease;
        border: none;
        cursor: pointer;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
    }

    .btn-secondary {
        background: transparent;
        color: #3b82f6;
        padding: 0.875rem 2rem;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s ease;
        border: 2px solid #3b82f6;
        cursor: pointer;
    }

    .btn-secondary:hover {
        background: rgba(59, 130, 246, 0.05);
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
