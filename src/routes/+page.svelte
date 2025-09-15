<!-- src/routes/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>My Book Reviews</title>
</svelte:head>

<div class="container">
    <h1>📚 My Bookshelf</h1>
    <div class="books-grid">
        {#each data.books as book}
            <article class="book-card">
                {#if book.cover_image_url}
                    <img src={book.cover_image_url} alt={book.title} class="cover" />
                {:else}
                    <div class="cover-placeholder">No Cover</div>
                {/if}
                <div class="book-info">
                    <h2>{book.title}</h2>
                    <p class="author">by {book.author}</p>
                    {#if book.avg_rating}
                        <div class="rating">⭐ {parseFloat(book.avg_rating).toFixed(1)} ({book.review_count} reviews)</div>
                    {/if}
                    <a href="/books/{book.id}" class="btn">Read Reviews</a>
                </div>
            </article>
        {/each}
    </div>
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
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        transition: transform 0.2s ease;
    }
    .book-card:hover {
        transform: translateY(-4px);
    }
    .cover {
	width: 100%;
	aspect-ratio: 2/3;
	object-fit: cover;
	border-radius: 8px 8px 0 0;
	background: #f0f0f0; /* fallback background while loading */
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
</style>
