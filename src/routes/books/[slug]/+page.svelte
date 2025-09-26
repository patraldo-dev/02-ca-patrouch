<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    
    let book = null;
    let loading = true;
    let error = null;
    
    export let params;
    
    onMount(async () => {
        try {
            if (!params.slug || params.slug === 'undefined') {
                error = 'Invalid book slug';
                loading = false;
                return;
            }
            
            const response = await fetch(`/api/books/${params.slug}`);
            if (response.ok) {
                book = await response.json();
            } else {
                error = 'Failed to load book';
            }
        } catch (err) {
            console.error('Error fetching book:', err);
            error = 'Network error. Please try again.';
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head>
    <title>{book ? book.title : 'Book Details'}</title>
</svelte:head>

<div class="container">
    {#if loading}
        <div class="loading">
            <p>Loading book...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
            <button on:click={() => goto('/')} class="btn-secondary">Go Home</button>
        </div>
    {:else if book}
        <div class="book-detail">
            <div class="book-header">
                <h1>{book.title}</h1>
                <div class="book-actions">
                    <a href={`/admin/books/edit/${book.slug}`} class="btn-secondary">Edit</a>
                </div>
            </div>
            
            <div class="book-content">
                {#if book.coverImageId}
                    <div class="book-cover">
                        <img src={`/images/${book.coverImageId}`} alt={book.title} />
                    </div>
                {/if}
                
                <div class="book-info">
                    <p><strong>Author:</strong> {book.author}</p>
                    {#if book.published_year}
                        <p><strong>Published:</strong> {book.published_year}</p>
                    {/if}
                    <p><strong>Status:</strong> {book.published ? 'Published' : 'Draft'}</p>
                    {#if book.description}
                        <div class="book-description">
                            <h3>Description</h3>
                            <p>{book.description}</p>
                        </div>
                    {/if}
                </div>
            </div>
            
            <div class="back-link">
                <a href="/" class="btn-secondary">Back to Home</a>
            </div>
        </div>
    {:else}
        <div class="error">
            <p>Book not found</p>
            <button on:click={() => goto('/')} class="btn-secondary">Go Home</button>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .loading, .error {
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
    
    .book-detail {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .book-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .book-header h1 {
        font-size: 2rem;
        color: #1f2937;
        margin: 0;
    }
    
    .book-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .book-content {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
    }
    
    .book-cover {
        flex: 0 0 300px;
    }
    
    .book-cover img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .book-info {
        flex: 1;
    }
    
    .book-info p {
        margin: 0.5rem 0;
        font-size: 1.1rem;
    }
    
    .book-description {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .book-description h3 {
        margin-top: 0;
        color: #4b5563;
    }
    
    .back-link {
        margin-top: 2rem;
    }
    
    .btn-secondary {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        background: #e5e7eb;
        color: #374151;
        display: inline-block;
    }
    
    .btn-secondary:hover {
        background: #d1d5db;
    }
    
    @media (max-width: 768px) {
        .book-header {
            flex-direction: column;
            gap: 1rem;
        }
        
        .book-content {
            flex-direction: column;
        }
        
        .book-cover {
            flex: none;
            max-width: 300px;
            margin: 0 auto;
        }
    }
</style>
