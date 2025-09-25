// src/routes/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, data }) {
    // ✅ Safely access data.user
    const user = data?.user || null;
    
    const booksResponse = await fetch('/api/books');
    const books = booksResponse.ok ? await booksResponse.json() : [];

    return {
        user,
        books
    };
}
