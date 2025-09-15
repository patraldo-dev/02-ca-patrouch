// src/routes/books/[id]/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
    const res = await fetch(`/api/books/${params.id}`);
    const book = await res.json();

    if (!res.ok) {
        throw new Error(book.error || 'Failed to load book');
    }

    return { book };
}
