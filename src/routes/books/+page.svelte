<!-- src/routes/books/+page.svelte -->
<script>
    export let data;
    
    // State for loading and errors
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
                error = 'Failed to load books';
            }
        } catch (err) {
            console.error('Error fetching books:', err);
            error = 'Network error. Please try again.';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Todos los Libros — ShelfTalk</title>
</svelte:head>

<div class="container">
    <h1>📚 Mis Libros</h1>
    
    {#if loading}
        <div class="loading-state">
            <p>Loading books...</p>
        </div>
    {:else if error}
        <div class="error-state">
            <p>{error}</p>
            <button on:click={fetchBooks} class="retry-btn">Try Again</button>
        </div>
    {:else if books.length === 0}
        <div class="empty-state">
            <p>No books found. Check back later for new additions!</p>
            <a href="/" class="btn">← Back to Home</a>
        </div>
    {:else}
        <div class="books-grid">
            {#each books as book}
                <article class="book-card">
                    {#if book.coverImageId}
                        <a href={`/books/${book.slug}`}>
                            <img 
                                src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${book.coverImageId}/cover`}
                                alt={`Cover of ${book.title}`}
                                class="book-cover"
                            />
                        </a>
                    {:else if book.coverImageId}
                        <a href={`/books/${book.slug}`}>
                            <img 
                                src={book.coverImageId}
                                alt={`Cover of ${book.title}`}
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
                        <p class="author">by {book.author}</p>
                        {#if book.avg_rating}
                            <div class="rating">⭐ {parseFloat(book.avg_rating).toFixed(1)} ({book.review_count || 0} reviews)</div>
                        {/if}
                        <a href={`/books/${book.slug}`} class="btn">Read Reviews</a>
                    </div>
                </article>
            {/each}
        </div>
    {/if}
</div>

<style>
    /* Existing styles */
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
    
    /* New styles for loading, error, and empty states */
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
