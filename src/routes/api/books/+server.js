// src/routes/api/books/+server.js

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    try {
        const { db } = locals;

        if (!db) {
            return new Response(
                JSON.stringify({ error: 'Database not available' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { results: books } = await db.prepare(`
            SELECT 
                b.id,
                b.title,
                b.author,
                b.cover_image_url,
                b.description,
                b.published_year,
                AVG(r.rating) as avg_rating,
                COUNT(r.id) as review_count
            FROM books b
            LEFT JOIN reviews r ON b.id = r.book_id
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `).bind().all(); // ← 💡 .bind() is REQUIRED

        return new Response(JSON.stringify(books), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in /api/books:', error);

        return new Response(
            JSON.stringify({ error: 'Internal Server Error', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
