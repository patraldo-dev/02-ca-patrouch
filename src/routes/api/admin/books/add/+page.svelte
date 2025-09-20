<!-- src/routes/admin/books/add/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let title = '';
    let author = '';
    let isbn = '';
    let cover_image_url = '';
    let description = '';
    let published_year = '';
    let error = '';
    let success = false;

    const handleSubmit = async (event) => {
        error = '';
        success = false;

        const res = await fetch('/api/admin/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                author,
                isbn,
                cover_image_url,
                description,
                published_year: parseInt(published_year) || null
            })
        });

        const data = await res.json();

        if (!res.ok) {
            error = data.error || 'Failed to add book';
            return;
        }

        success = true;
        title = author = isbn = cover_image_url = description = published_year = '';
    };
</script>

<svelte:head>
    <title>Add Book — Admin</title>
</svelte:head>

<div class="container">
    <h1>Add New Book</h1>

    {#if success}
        <div class="alert success">
            ✅ Book added successfully!
        </div>
    {:else}
        {#if error}
            <div class="alert error">
                ❌ {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} use:enhance>
            <div class="form-group">
                <label for="title">Title *</label>
                <input
                    id="title"
                    bind:value={title}
                    required
                    placeholder="The Name of the Wind"
                />
            </div>
            <div class="form-group">
                <label for="author">Author *</label>
                <input
                    id="author"
                    bind:value={author}
                    required
                    placeholder="Patrick Rothfuss"
                />
            </div>
            <div class="form-group">
                <label for="isbn">ISBN</label>
                <input
                    id="isbn"
                    bind:value={isbn}
                    placeholder="978-0-7564-0474-1"
                />
            </div>
            <div class="form-group">
                <label for="cover_image_url">Cover Image URL</label>
                <input
                    id="cover_image_url"
                    bind:value={cover_image_url}
                    placeholder="https://imagedelivery.net/.../cover/public"
                />
            </div>
            <div class="form-group">
                <label for="description">Description</label>
                <textarea
                    id="description"
                    bind:value={description}
                    rows="4"
                    placeholder="A beautiful, lyrical fantasy novel..."
                ></textarea>
            </div>
            <div class="form-group">
                <label for="published_year">Published Year</label>
                <input
                    id="published_year"
                    type="number"
                    bind:value={published_year}
                    placeholder="2007"
                    min="1000"
                    max="2100"
                />
            </div>
            <button type="submit" class="btn-primary">
                Add Book
            </button>
        </form>
    {/if}

    <a href="/admin/books" class="btn-secondary">← Back to Books</a>
</div>

<style>
    .container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h1 {
        margin-bottom: 2rem;
        color: #333;
    }
    .form-group {
        margin-bottom: 1.5rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #555;
    }
    input, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }
    button {
        width: 100%;
        padding: 0.75rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    button:hover {
        background: #2563eb;
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        font-weight: 500;
    }
    .success {
        background: #dcfce7;
        color: #166534;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
    }
    .btn-secondary {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #e5e7eb;
        color: #333;
        text-decoration: none;
        border-radius: 6px;
    }
</style>
