// src/routes/api/admin/books/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    // In future, add role-based auth here
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { title, author, isbn, cover_image_url, description, published_year } = await request.json();
        const db = locals.db;

        // Validate
        if (!title || !author) {
            return new Response(JSON.stringify({ error: 'Title and author required' }), { status: 400 });
        }

        // Insert book
        const bookId = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO books (id, title, author, isbn, cover_image_url, description, published_year)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            bookId,
            title,
            author,
            isbn || null,
            cover_image_url || null,
            description || null,
            published_year || null
        ).run();

        return new Response(JSON.stringify({ success: true, bookId }), { status: 200 });

    } catch (error) {
        console.error('Add book error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
