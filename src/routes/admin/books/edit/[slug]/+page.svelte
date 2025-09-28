
<!-- In the form -->
<div class="form-group">
    <label for="coverImage">Cover Image</label>
    {#if form.coverImageId}
        <div class="current-cover">
            <!-- Use the correct Cloudflare Images URL -->
            <img 
                src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${form.coverImageId}/cover`} 
                alt="Current cover" 
            />
            <button type="button" class="btn-danger" on:click={() => form.coverImageId = null}>
                Remove Cover
            </button>
        </div>
    {:else}
        <input 
            id="coverImage" 
            name="coverImage"
            type="file" 
            accept="image/*" 
            on:change={handleFileChange}
            disabled={uploading}
        />
        {#if uploading}
            <p>Uploading image...</p>
        {/if}
    {/if}
</div>

<svelte:head>
    <title>Edit Book — Admin</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <h1>Edit Book</h1>
        <a href="/admin/books" class="btn-secondary">Back to Books</a>
    </div>
    
    {#if loading}
        <div class="loading">
            <p>Loading book...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if book}
        <form class="book-form" on:submit|preventDefault={handleSubmit}>

            <div class="form-group">
                <label for="title">Title *</label>
                <input type="text" id="title" bind:value={form.title} required>
            </div>
            
            <div class="form-group">
                <label for="author">Author *</label>
                <input type="text" id="author" bind:value={form.author} required>
            </div>
            
            <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" bind:value={form.description} rows="4"></textarea>
            </div>
            
            <div class="form-group">
                <label for="published_year">Published Year</label>
                <input type="number" id="published_year" bind:value={form.published_year}>
            </div>
            
            <div class="form-group">
                <label for="slug">Slug *</label>
                <input type="text" id="slug" bind:value={form.slug} required>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" bind:checked={form.published}>
                    Published
                </label>
            </div>
            
            <div class="form-group">
                <label for="coverImage">Cover Image</label>
                {#if form.coverImageId}
                    <div class="current-cover">
                        <img src={`/images/${form.coverImageId}`} alt="Current cover" />
                        <button type="button" class="btn-danger" on:click={() => form.coverImageId = null}>
                            Remove Cover
                        </button>
                    </div>
                {:else}
                    <input id="coverImage" 
            name="coverImage"  
            type="file" 
            accept="image/*" 
            on:change={handleFileChange}
        />

                {/if}
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">Update Book</button>
                <a href="/admin/books" class="btn-secondary">Cancel</a>
            </div>
        </form>
    {:else}
        <div class="error">
            <p>Book not found</p>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    
    .page-header h1 {
        font-size: 2rem;
        color: #1f2937;
        margin: 0;
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
    
    .book-form {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
    }
    
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .form-group input[type="checkbox"] {
        margin-right: 0.5rem;
    }
    
    .current-cover {
        margin-top: 1rem;
    }
    
    .current-cover img {
        max-width: 200px;
        max-height: 300px;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        display: block;
    }
    
    .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
    }
    
    .btn-primary, .btn-secondary, .btn-danger {
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        font-size: 1rem;
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
        .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .form-actions {
            flex-direction: column;
        }
    }
</style>
