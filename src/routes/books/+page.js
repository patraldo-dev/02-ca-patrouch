// src/routes/books/+page.js
export async function load({ fetch }) {
    const res = await fetch('/api/books');
    const books = await res.json();
    return { books };
}
