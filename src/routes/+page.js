// src/routes/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, data }) {
    // data.user comes from +layout.server.js
    return {
        user: data.user,
        books: await (await fetch('/api/books')).json()
    };
}
