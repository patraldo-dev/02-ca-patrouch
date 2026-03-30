<!-- src/routes/books/+page.svelte -->
<script>
    import { t, getLocale } from '$lib/i18n';
    import ExLibrisIcon from '$lib/components/ExLibrisIcon.svelte';

    export let data;
    
    let loading = false;
    let error = null;
    let books = data?.books || [];
    
    function ratingText(book) {
        const loc = getLocale();
        const r = parseFloat(book.avg_rating);
        const c = book.review_count;
        const templates = {
            en: (rr, cc) => cc === 1 ? `⭐ ${rr} (${cc} review)` : `⭐ ${rr} (${cc} reviews)`,
            es: (rr, cc) => cc === 1 ? `⭐ ${rr} (${cc} reseña)` : `⭐ ${rr} (${cc} reseñas)`,
            fr: (rr, cc) => `⭐ ${rr} (${cc} avis)`
        };
        return (templates[loc] || templates.en)(r, c);
    }

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
        <div class="state-box">
            <p>{$t('pages.books.loading')}</p>
        </div>
    {:else if error}
        <div class="state-box error">
            <p>{error}</p>
            <button on:click={fetchBooks} class="btn-accent">{$t('pages.books.retry')}</button>
        </div>
    {:else if books.length === 0}
        <div class="state-box empty">
            <p>{$t('pages.books.empty.message')}</p>
            <a href="/" class="btn-accent">{$t('pages.books.empty.backToHome')}</a>
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
                        <div class="book-cover-placeholder">
                            <ExLibrisIcon />
                        </div>
                    {/if}
                    <div class="book-info">
                        <a href={`/books/${book.slug}`}>
                            <h2>{book.title}</h2>
                        </a>
                        <p class="author">{$t('pages.books.book.by')} {book.author}</p>
                        {#if book.avg_rating}
                            <div class="rating">
                                {ratingText(book)}
                            </div>
                        {/if}
                        <a href={`/books/${book.slug}`} class="btn-accent">{$t('pages.books.book.readReviews')}</a>
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
    
    .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
    }
    
    .book-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: transform 0.2s ease, border-color 0.3s ease;
    }
    
    .book-card:hover {
        transform: translateY(-4px);
        border-color: rgba(201, 168, 124, 0.3);
    }
    
    .book-cover {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
    }
    
    .book-cover-placeholder {
        width: 100%;
        aspect-ratio: 2/3;
        background: var(--surface-raised);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }
    
    .book-info {
        padding: 1rem;
    }
    
    .book-info h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
        color: var(--text);
    }
    
    .author {
        color: var(--text-dim);
        margin: 0 0 0.5rem 0;
    }
    
    .rating {
        color: #eab308;
        font-weight: 600;
        margin: 0 0 1rem 0;
    }
    
    .btn-accent {
        display: inline-block;
        background: var(--accent);
        color: var(--bg);
        padding: 0.5rem 1rem;
        border-radius: var(--radius);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.875rem;
        transition: background 0.2s;
    }
    
    .btn-accent:hover {
        background: var(--accent-hover);
    }
    
    .state-box {
        text-align: center;
        padding: 3rem 1rem;
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

    .state-box.error .btn-accent {
        margin-top: 1rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: var(--radius);
        cursor: pointer;
        font-weight: 600;
    }

    .state-box.empty {
        background: rgba(3, 105, 161, 0.1);
        border-color: rgba(3, 105, 161, 0.3);
    }

    .state-box .btn-accent {
        margin-top: 1rem;
    }
</style>
