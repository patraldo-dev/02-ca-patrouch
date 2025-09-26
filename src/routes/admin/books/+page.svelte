<!-- src/routes/admin/books/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    
    let books = [];
    let loading = true;
    let error = null;
    
    onMount(async () => {
        try {
            const response = await fetch('/api/admin/books');
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
    });
    
    async function deleteBook(bookId) {
        if (!confirm('Are you sure you want to delete this book?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/books/${bookId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remove the book from the list
                books = books.filter(b => b.id !== bookId);
            } else {
                alert('Failed to delete book');
            }
        } catch (err) {
            console.error('Error deleting book:', err);
            alert('Failed to delete book');
        }
    }
</script>

<svelte:head>
    <title>Admin — Books</title>
</svelte:head>

<div class="container">
    <div class="admin-header">
        <h1>Book Management</h1>
        <a href="/admin/books/add" class="btn-primary">Add New Book</a>
    </div>
    
    {#if loading}
        <div class="loading">
            <p>Loading books...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if books.length === 0}
        <div class="empty">
            <p>No books found.</p>
            <a href="/admin/books/add" class="btn-primary">Add Your First Book</a>
        </div>
    {:else}
        <div class="books-table">
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Published</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each books as book}
                        <tr>
                            <td>{book.title}</td>
                            <td>{book.author}</td>
                            <td>{book.published_year || 'N/A'}</td>
                            <td class="actions">
                                <a href={`/admin/books/edit/${book.id}`} class="btn-secondary">Edit</a>
                                <button on:click={() => deleteBook(book.id)} class="btn-danger">Delete</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    
    .admin-header h1 {
        font-size: 2rem;
        color: #1f2937;
        margin: 0;
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
    
    .books-table {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th {
        background: #f9fafb;
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        color: #374151;
        border-bottom: 1px solid #e5e7eb;
    }
    
    td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f3f4f6;
    }
    
    tr:last-child td {
        border-bottom: none;
    }
    
    .actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .btn-primary, .btn-secondary, .btn-danger {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2563eb;
    }
    
    .btn-secondary {
        background: #e5e7eb;
        color: #374151;
    }
    
    .btn-secondary:hover {
        background: #d1d5db;
    }
    
    .btn-danger {
        background: #ef4444;
        color: white;
    }
    
    .btn-danger:hover {
        background: #dc2626;
    }
    
    @media (max-width: 768px) {
        .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .books-table {
            overflow-x: auto;
        }
        
        .actions {
            flex-direction: column;
        }
    }
</style>
