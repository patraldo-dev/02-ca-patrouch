<!-- src/routes/admin/blog/write/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let title = '';
    let slug = '';
    let content = '';
    let isPublished = false;
    let error = '';
    let success = false;

    // Auto-generate slug from title
$: slug = title
    .normalize('NFD')                  // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics (accents)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')     // Keep only a-z, 0-9, space, hyphen
    .replace(/[\s_-]+/g, '-')         // Replace spaces/underscores with hyphen
    .replace(/^-+|-+$/g, '');         // Trim hyphens from start/end

    const handleSubmit = async (event) => {
        error = '';
        success = false;

        if (!title || !content) {
            error = 'Title and content are required';
            return;
        }

        if (!slug) {
            error = 'Slug cannot be empty';
            return;
        }

        const postData = {
            title,
            slug,
            content,
            published: isPublished
        };

        const res = await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        const data = await res.json();

        if (!res.ok) {
            error = data.error || 'Failed to save post';
            return;
        }

        success = true;
        title = slug = content = '';
        isPublished = false;
    };
</script>

<svelte:head>
    <title>Write Blog Post — Admin</title>
</svelte:head>

<div class="container">
    <h1>✍️ Write New Blog Post</h1>

    {#if success}
        <div class="alert success">
            ✅ Post saved successfully!
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
                    placeholder="My Book Review Journey"
                />
            </div>
            <div class="form-group">
                <label for="slug">Slug *</label>
                <input
                    id="slug"
                    bind:value={slug}
                    required
                    placeholder="my-book-review-journey"
                />
                <small class="hint">URL-friendly version of title — auto-generated</small>
            </div>
            <div class="form-group">
                <label for="content">Content *</label>
                <textarea
                    id="content"
                    bind:value={content}
                    rows="15"
                    required
                    placeholder="Write your post in Markdown..."
                ></textarea>
                <small class="hint">
                    Use Markdown: **bold**, *italic*, # Headers, [links](https://example.com), ![images](image.jpg)
                </small>
            </div>
            <div class="form-group checkbox">
                <label>
                    <input type="checkbox" bind:checked={isPublished} />
                    Publish immediately
                </label>
                <small class="hint">
                    {#if isPublished}
                        Post will be visible at /blog/{slug}
                    {:else}
                        Post will be saved as draft
                    {/if}
                </small>
            </div>
            <button type="submit" class="btn-primary">
                Save Post
            </button>
        </form>
    {/if}

    <a href="/admin/blog" class="btn-secondary">← Back to Blog Posts</a>
</div>

<style>
    .container {
        max-width: 800px;
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
    .hint {
        display: block;
        margin-top: 0.5rem;
        color: #666;
        font-size: 0.9rem;
    }
    .checkbox label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        color: #333;
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
