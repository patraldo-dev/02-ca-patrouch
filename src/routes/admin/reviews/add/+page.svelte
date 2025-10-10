<!-- src/routes/admin/reviews/add/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let bookId = '';
    let userId = '';
    let rating = 5;
    let content = '';
    let error = '';
    let success = false;
    let books = [];
    let users = [];

    // Load books and users on mount
    async function loadBooksAndUsers() {
        // Fetch books
        const booksRes = await fetch('/api/books');
        books = await booksRes.json();

        // Fetch users (for now, just you — later, all users)
        const usersRes = await fetch('/api/admin/users');
        users = await usersRes.json();
    }

    loadBooksAndUsers();

    const handleSubmit = async (event) => {
        error = '';
        success = false;

        if (!bookId || !userId || !content) {
            error = 'Book, user, and content are required';
            return;
        }

        const res = await fetch('/api/admin/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: bookId,
                user_id: userId,
                rating: parseInt(rating),
                content
            })
        });

        const data = await res.json();

        if (!res.ok) {
            error = data.error || 'Failed to add review';
            return;
        }

        success = true;
        bookId = userId = rating = 5;
        content = '';
    };
</script>

<svelte:head>
    <title>Add Review — Admin</title>
</svelte:head>

<div class="container">
    <h1>Add New Review</h1>

    {#if success}
        <div class="alert success">
            ✅ Review added successfully!
        </div>
    {:else}
        {#if error}
            <div class="alert error">
                ❌ {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} use:enhance>
            <div class="form-group">
                <label for="bookId">Book *</label>
                <select id="bookId" bind:value={bookId} required>
                    <option value="">-- Select a book --</option>
                    {#each books as book}
                        <option value={book.id}>{book.title} by {book.author}</option>
                    {/each}
                </select>
            </div>
            <div class="form-group">
                <label for="userId">User *</label>
                <select id="userId" bind:value={userId} required>
                    <option value="">-- Select a user --</option>
                    {#each users as user}
                        <option value={user.id}>{user.username} ({user.email})</option>
                    {/each}
                </select>
            </div>
            <div class="form-group">
                <label for="rating">Rating *</label>
                <select id="rating" bind:value={rating} required>
                    <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ (4/5)</option>
                    <option value="3">⭐⭐⭐ (3/5)</option>
                    <option value="2">⭐⭐ (2/5)</option>
                    <option value="1">⭐ (1/5)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="content">Review Content *</label>
                <textarea
                    id="content"
                    bind:value={content}
                    rows="6"
                    required
                    placeholder="Write your review here..."
                ></textarea>
            </div>
            <button type="submit" class="btn-primary">
                Add Review
            </button>
        </form>
    {/if}

    <a href="/admin/reviews" class="btn-secondary">← Back to Reviews</a>
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
    button {
        width: 100%;
        padding: 0.75rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    button:hover {
        background: var(--primary-dark);
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
