<!-- src/routes/admin/books/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let books = [];
    let error = '';

    // Load books on mount
    async function loadBooks() {
        try {
            const res = await fetch('/api/books');
            books = await res.json();
        } catch (err) {
            error = 'Failed to load books';
        }
    }

    loadBooks();
</script>

<svelte:head>
    <title>Manage Books — Admin</title>
</svelte:head>

<div class="container">
    <h1>📚 Manage Books</h1>
    
    {#if error}
        <div class="alert error">{error}</div>
    {/if}

    <div class="actions">
        <a href="/admin/books/add" class="btn-primary">➕ Add New Book</a>
    </div>

    {#if books.length === 0}
        <p>No books found. Add your first book!</p>
    {:else}
        <div class="books-grid">
            {#each books as book}
                <div class="book-card">
                    {#if book.cover_image_url}
                        <img src={book.cover_image_url} alt={book.title} class="cover" />
                    {/if}
                    <div class="book-info">
                        <h3>{book.title}</h3>
                        <p class="author">by {book.author}</p>
                        {#if book.isbn}
                            <p class="isbn">ISBN: {book.isbn}</p>
                        {/if}
                        <div class="actions">
                            <a href={`/admin/books/edit/${book.id}`} class="btn-secondary">Edit</a>
                        </div>
                    </div>
                </div>
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
    h1 {
        color: #333;
        margin-bottom: 2rem;
    }
    .actions {
        margin-bottom: 2rem;
        text-align: right;
    }
    .btn-primary {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
    .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
    }
    .book-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
    }
    .cover {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
    }
    .book-info {
        padding: 1.5rem;
    }
    .book-info h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }
    .author {
        color: #666;
        margin: 0 0 0.5rem 0;
    }
    .isbn {
        color: #888;
        font-size: 0.9rem;
        margin: 0 0 1rem 0;
    }
    .actions {
        margin-top: 1rem;
    }
    .btn-secondary {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #e5e7eb;
        color: #333;
        text-decoration: none;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
    }
</style>
