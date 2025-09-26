<!-- src/routes/admin/books/add/+page.svelte -->
<script>
    let title = '';
    let author = '';
    let description = '';
    let published_year = '';
    let coverImage = null;
    let isLoading = false;
    let message = '';
    let isSuccess = false;
    
    async function handleSubmit() {
        if (!title || !author) {
            message = 'Title and author are required';
            return;
        }
        
        isLoading = true;
        message = '';
        
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('author', author);
            formData.append('description', description);
            
            // Only append published_year if it has a value
            if (published_year) {
                formData.append('published_year', published_year);
            }
            
            // Only append coverImage if a file was selected
            if (coverImage) {
                formData.append('coverImage', coverImage);
            }
            
            const response = await fetch('/api/admin/books', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                isSuccess = true;
                message = 'Book created successfully!';
                // Reset form
                title = '';
                author = '';
                description = '';
                published_year = '';
                coverImage = null;
                // Reset file input
                const fileInput = document.getElementById('coverImage');
                if (fileInput) {
                    fileInput.value = '';
                }
            } else {
                message = result.error || 'Failed to create book';
            }
        } catch (err) {
            console.error('Error creating book:', err);
            message = 'Network error. Please try again.';
        } finally {
            isLoading = false;
        }
    }
    
    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            coverImage = file;
        }
    }
</script>

<div class="container">
    <h1>Add New Book</h1>
    
    {#if message}
        <div class="message" class:success={isSuccess} class:error={!isSuccess}>
            {message}
        </div>
    {/if}
    
    <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
            <label for="title">Title *</label>
            <input
                id="title"
                bind:value={title}
                type="text"
                required
                disabled={isLoading}
            />
        </div>
        
        <div class="form-group">
            <label for="author">Author *</label>
            <input
                id="author"
                bind:value={author}
                type="text"
                required
                disabled={isLoading}
            />
        </div>
        
        <div class="form-group">
            <label for="description">Description</label>
            <textarea
                id="description"
                bind:value={description}
                rows="4"
                disabled={isLoading}
            ></textarea>
        </div>
        
        <div class="form-group">
            <label for="published_year">Published Year</label>
            <input
                id="published_year"
                bind:value={published_year}
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                disabled={isLoading}
            />
        </div>
        
        <div class="form-group">
            <label for="coverImage">Cover Image</label>
            <input
                id="coverImage"
                type="file"
                accept="image/*"
                on:change={handleFileChange}
                disabled={isLoading}
            />
            {#if coverImage}
                <p class="file-info">Selected: {coverImage.name}</p>
            {/if}
        </div>
        
        <button type="submit" disabled={isLoading}>
            {#if isLoading}
                Creating...
            {:else}
                Create Book
            {/if}
        </button>
    </form>
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 2rem;
    }
    
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
    }
    
    input, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 1rem;
    }
    
    input:focus, textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    button {
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    button:hover {
        background: #2563eb;
    }
    
    button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    
    .message {
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
    }
    
    .message.success {
        background: #d1fae5;
        color: #065f46;
    }
    
    .message.error {
        background: #fee2e2;
        color: #b91c1c;
    }
    
    .file-info {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #6b7280;
    }
</style>
