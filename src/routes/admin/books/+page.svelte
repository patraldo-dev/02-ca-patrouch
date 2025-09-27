<!-- src/routes/admin/books/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    
    let books = [];
    let filteredBooks = [];
    let loading = true;
    let error = null;
    let searchQuery = '';
    let sortField = 'title';
    let sortDirection = 'asc';
    let showNotification = false;
    let notificationMessage = '';
    let notificationType = 'success';
    let filterPublished = 'all'; // 'all', 'published', 'unpublished'
    
    onMount(async () => {
        try {
            const response = await fetch('/api/admin/books');
            if (response.ok) {
                books = await response.json();
                applyFiltersAndSort();
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
    
    function applyFiltersAndSort() {
        // Apply search filter
        filteredBooks = books.filter(book => {
            const matchesSearch = !searchQuery || 
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                book.slug.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesPublished = filterPublished === 'all' || 
                (filterPublished === 'published' && book.published) ||
                (filterPublished === 'unpublished' && !book.published);
                
            return matchesSearch && matchesPublished;
        });
        
        // Apply sorting
        filteredBooks.sort((a, b) => {
            let aValue = a[sortField] || '';
            let bValue = b[sortField] || '';
            
            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    function toggleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        applyFiltersAndSort();
    }
    
    function showNotificationMessage(message, type = 'success') {
        notificationMessage = message;
        notificationType = type;
        showNotification = true;
        
        setTimeout(() => {
            showNotification = false;
        }, 3000);
    }

async function togglePublished(book) {
    try {
        const response = await fetch(`/api/admin/books/${book.slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...book,
                published: !book.published
            })
        });
        
        if (response.ok) {
            // Update the book in the list
            books = books.map(b => {
                if (b.slug === book.slug) {
                    return { ...b, published: !b.published };
                }
                return b;
            });
            applyFiltersAndSort();
            showNotificationMessage(`Book ${!book.published ? 'published' : 'unpublished'} successfully`);
        } else {
            const result = await response.json();
            showNotificationMessage('Failed to update book: ' + result.error, 'error');
        }
    } catch (err) {
        console.error('Error updating book:', err);
        showNotificationMessage('Failed to update book', 'error');
    }
}    

    async function deleteBook(bookSlug) {
        if (!confirm('Are you sure you want to delete this book?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/books/${bookSlug}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remove the book from the list
                books = books.filter(b => b.slug!== bookSlug);
                applyFiltersAndSort();
                showNotificationMessage('Book deleted successfully');
            } else {
                showNotificationMessage('Failed to delete book', 'error');
            }
        } catch (err) {
            console.error('Error deleting book:', err);
            showNotificationMessage('Failed to delete book', 'error');
        }
    }

async function cleanupBooks() {
    try {
        const response = await fetch('/api/admin/cleanup', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotificationMessage(result.message);
            // Reload the page to see the updated books
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotificationMessage('Cleanup failed: ' + result.error, 'error');
        }
    } catch (err) {
        console.error('Error cleaning up books:', err);
        showNotificationMessage('Error cleaning up books', 'error');
    }
}    

    async function runMigration() {
        try {
            const response = await fetch('/api/admin/migrate', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showNotificationMessage(result.message);
                // Reload the page to see the updated books
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotificationMessage('Migration failed: ' + result.error, 'error');
            }
        } catch (err) {
            console.error('Error running migration:', err);
            showNotificationMessage('Error running migration', 'error');
        }
    }

async function fixSchema() {
    try {
        const response = await fetch('/api/admin/fix-schema', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotificationMessage(result.message);
            // Reload the page to see the updated books
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotificationMessage('Schema fix failed: ' + result.error, 'error');
        }
    } catch (err) {
        console.error('Error fixing schema:', err);
        showNotificationMessage('Error fixing schema', 'error');
    }
} 

    async function updateSlugs() {
        try {
            const response = await fetch('/api/admin/update-slugs', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                showNotificationMessage(result.message);
                // Reload the page to see the updated books
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotificationMessage('Failed to update slugs: ' + result.error, 'error');
            }
        } catch (err) {
            console.error('Error updating slugs:', err);
            showNotificationMessage('Error updating slugs', 'error');
        }
    }
    
    $: {
        applyFiltersAndSort();
    }
</script>

<svelte:head>
    <title>Admin — Books</title>
</svelte:head>

<div class="container">
    <div class="admin-header">
        <h1>Book Management</h1>
        <div class="header-actions">
            <button on:click={fixSchema} class="btn-secondary">Fix Schema</button>
            <button on:click={cleanupBooks} class="btn-secondary">Cleanup Books</button>
            <button on:click={updateSlugs} class="btn-secondary">Update Slugs</button>
            <button on:click={runMigration} class="btn-secondary">Run Migration</button>
            <a href="/admin/books/add" class="btn-primary">Add New Book</a>
        </div>
    </div>
    
    <div class="filters-section">
        <div class="search-container">
            <input 
                type="text" 
                placeholder="Search books..." 
                bind:value={searchQuery}
                class="search-input"
            />
        </div>
        
        <div class="filter-container">
            <label for="published-filter">Filter:</label>
            <select id="published-filter" bind:value={filterPublished} class="filter-select">
                <option value="all">All Books</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
            </select>
        </div>
    </div>
    
    {#if showNotification}
        <div class="notification {notificationType}">
            {notificationMessage}
        </div>
    {/if}
    
    {#if loading}
        <div class="loading">
            <p>Loading books...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if filteredBooks.length === 0}
        <div class="empty">
            <p>{books.length === 0 ? 'No books found.' : 'No books match your search criteria.'}</p>
            {#if books.length === 0}
                <a href="/admin/books/add" class="btn-primary">Add Your First Book</a>
            {:else}
                <button on:click={() => {searchQuery = ''; filterPublished = 'all';}} class="btn-secondary">Clear Filters</button>
            {/if}
        </div>
    {:else}
        <div class="books-table">
            <table>
                <thead>
                    <tr>
                        <th class="sortable" on:click={() => toggleSort('id')}>
                            ID {#if sortField === 'id'}{sortDirection === 'asc' ? '↑' : '↓'}{/if}
                        </th>
                        <th class="sortable" on:click={() => toggleSort('title')}>
                            Title {#if sortField === 'title'}{sortDirection === 'asc' ? '↑' : '↓'}{/if}
                        </th>
                        <th class="sortable" on:click={() => toggleSort('author')}>
                            Author {#if sortField === 'author'}{sortDirection === 'asc' ? '↑' : '↓'}{/if}
                        </th>
                        <th class="sortable" on:click={() => toggleSort('slug')}>
                            Slug {#if sortField === 'slug'}{sortDirection === 'asc' ? '↑' : '↓'}{/if}
                        </th>
                        <th class="sortable" on:click={() => toggleSort('published_year')}>
                            Published {#if sortField === 'published_year'}{sortDirection === 'asc' ? '↑' : '↓'}{/if}
                        </th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each filteredBooks as book}
                        <tr>
                            <td>{book.id}</td>
                            <td>{book.title}</td>
                            <td>{book.author}</td>
                            <td><code>{book.slug}</code></td>
                            <td>{book.published_year || 'N/A'}</td>
                            <td>
                                <span class="status-badge {book.published ? 'published' : 'unpublished'}">
                                    {book.published ? 'Published' : 'Draft'}
                                </span>
                            </td>
<td class="actions">
    <a href={`/books/${book.slug}`} class="btn-secondary" target="_blank">View</a>
    <a href={`/admin/books/edit/${book.slug}`} class="btn-secondary">Edit</a>
    <button on:click={() => togglePublished(book)} class="btn-secondary">
        {book.published ? 'Unpublish' : 'Publish'}
    </button>
    <button on:click={() => deleteBook(book.slug)} class="btn-danger">Delete</button>


                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        
        <div class="results-info">
            Showing {filteredBooks.length} of {books.length} books
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
    
    .header-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .filters-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        gap: 1rem;
    }
    
    .search-container {
        flex: 1;
    }
    
    .search-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .filter-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .filter-select {
        padding: 0.75rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .notification {
        padding: 0.75rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        animation: fadeIn 0.3s ease-in-out;
    }
    
    .notification.success {
        background: #d1fae5;
        color: #065f46;
    }
    
    .notification.error {
        background: #fee2e2;
        color: #b91c1c;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
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
    
    th.sortable {
        cursor: pointer;
        user-select: none;
    }
    
    th.sortable:hover {
        background: #f3f4f6;
    }
    
    td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f3f4f6;
    }
    
    tr:last-child td {
        border-bottom: none;
    }
    
    code {
        background: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-family: monospace;
    }
    
    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .status-badge.published {
        background: #d1fae5;
        color: #065f46;
    }
    
    .status-badge.unpublished {
        background: #fef3c7;
        color: #92400e;
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
    
    .results-info {
        margin-top: 1rem;
        text-align: right;
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    @media (max-width: 768px) {
        .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .header-actions {
            flex-direction: column;
            width: 100%;
        }
        
        .filters-section {
            flex-direction: column;
        }
        
        .books-table {
            overflow-x: auto;
        }
        
        .actions {
            flex-direction: column;
        }
    }
</style>
