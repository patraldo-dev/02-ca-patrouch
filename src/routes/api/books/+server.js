// src/routes/api/books/+server.js
import { json } from '@sveltejs/kit';

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
        // ✅ Generate book ID
        const bookId = crypto.randomUUID();

        // ✅ Insert into DB with coverImageId
        await db
            .prepare('INSERT INTO books (id, title, author, isbn, coverImageId, slug) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(
                bookId,
                title,
                author,
                isbn || null,
                coverImageId || null,
                slugifyDiacritics(title) // ← You’ll need to import this
            )
            .run();

        return json({ success: true, id: bookId });

    } catch (err) {
        console.error('Failed to add book:', err);
        return json({ error: 'Failed to add book' }, { status: 500 });
    }
}

// ✅ Add slugify helper (or import from $lib/utils.js)
function slugifyDiacritics(str) {
    return str
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/[-\s]+/g, '-');
}
