<!-- src/routes/admin/books/edit/[slug]/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    
    let loading = true;
    let error = null;
    let uploading = false;
    let form = {
        title: '',
        author: '',
        published_year: '',
        slug: '',
        published: false,
        coverImageId: null,
        description: ''
    };
    
    export let data;
    
    // Initialize form with data from server load function
    $: {
        if (data?.book) {
            form = {
                title: data.book.title,
                author: data.book.author,
                published_year: data.book.published_year || '',
                slug: data.book.slug,
                published: data.book.published || false,
                coverImageId: data.book.coverImageId || null,
                description: data.book.description || ''
            };
        }
    }
    
    onMount(async () => {
        // No need to fetch data here since it's already loaded by the server
        loading = false;
    });
    
    async function handleSubmit() {
        try {
            const response = await fetch(`/api/admin/books/${form.slug}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            
            if (response.ok) {
                goto('/admin/books');
            } else {
                const result = await response.json();
                alert('Failed to update book: ' + result.error);
            }
        } catch (err) {
            console.error('Error updating book:', err);
            alert('Failed to update book');
        }
    }
    
    async function handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        uploading = true;
        
        try {
            // Use our own API endpoint instead of direct Cloudflare API
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                form = {
                    ...form,
                    coverImageId: result.imageId
                };
                console.log('Image uploaded successfully:', result.imageId);
            } else {
                const errorData = await response.json();
                alert('Failed to upload image: ' + errorData.error);
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Failed to upload image');
        } finally {
            uploading = false;
        }
    }
</script>

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
    {:else if data?.book}
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
                        <img 
                            src={`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${form.coverImageId}/cover`} 
                            alt="Current cover" 
                        />
                        <button type="button" class="btn-danger" on:click={() => form = {...form, coverImageId: null}}>
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
