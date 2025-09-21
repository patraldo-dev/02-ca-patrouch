<!-- src/routes/test-utf8/+page.svelte -->
<script>
    let input = '¡Hola, quién eres? Café, año, música';
    let result = '';

    async function testUTF8() {
        const res = await fetch('/api/test-utf8', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({ text: input })
        });
        const data = await res.json();
        result = data.received;
    }
</script>

<svelte:head>
    <title>UTF-8 Test — ShelfTalk</title>
    <meta charset="utf-8" />
</svelte:head>

<div class="container">
    <h1>UTF-8 Internationalization Test</h1>
    <form accept-charset="UTF-8">
        <textarea bind:value={input} rows="4" placeholder="Type text with diacritics..."></textarea>
        <button type="button" on:click={testUTF8}>Test UTF-8</button>
    </form>
    {#if result}
        <div class="result">
            <h2>Received:</h2>
            <p>{result}</p>
        </div>
    {/if}
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
    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
    }
    button {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    .result {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #f0fdf4;
        border-radius: 8px;
        border: 1px solid #bbf7d0;
    }
    .result h2 {
        margin: 0 0 1rem 0;
        color: #166534;
    }
    .result p {
        margin: 0;
        font-size: 1.1rem;
        color: #333;
    }
</style>
