// src/routes/api/books/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return json({ error: 'DB unavailable' }, { status: 500 });
    }

    try {
        const { results: books } = await db
            .prepare(`
                SELECT 
                    id, 
                    title, 
                    author, 
                    isbn, 
                    coverImageId, 
                FROM books
                ORDER BY title
            `)
            .all();

        return json(books);
    } catch (err) {
        console.error('Failed to fetch books:', err);
        return json({ error: 'Failed to fetch books' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return json({ error: 'DB unavailable' }, { status: 500 });
    }

    const { title, author, isbn, coverImageId } = await request.json();

    if (!title || !author) {
        return json({ error: 'Title and author required' }, { status: 400 });
    }

    try {
        const bookId = crypto.randomUUID();

        await db
            .prepare('INSERT INTO books (id, title, author, isbn, coverImageId, slug) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(
                bookId,
                title,
                author,
                isbn || null,
                coverImageId || null,
                slugifyDiacritics(title)
            )
            .run();

        return json({ success: true, id: bookId });
    } catch (err) {
        console.error('Failed to add book:', err);
        return json({ error: 'Failed to add book' }, { status: 500 });
    }
}

// Helper: slugify with diacritics
function slugifyDiacritics(str) {
    return str
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/[-\s]+/g, '-');
}
