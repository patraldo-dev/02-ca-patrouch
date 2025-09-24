<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<div class="book-detail">
    {#if data.book.coverImageId}
        <img 
            src={`https://imagedelivery.net/YOUR_ACCOUNT_HASH/${data.book.coverImageId}/desktop`}
            alt={`Cover of ${data.book.title}`}
            class="book-cover-large"
        />
    {/if}

    <h1>{data.book.title}</h1>
    <p><strong>Author:</strong> {data.book.author}</p>
    <p><strong>ISBN:</strong> {data.book.isbn}</p>

    <a href="/reviews" class="btn-primary">Read Reviews</a>
</div>

<style>
    .book-detail {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
    }
    .book-cover-large {
        width: 300px;
        height: auto;
        float: left;
        margin-right: 2rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .btn-primary {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
</style>
