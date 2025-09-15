// src/routes/api/books/+server.js

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    const { db } = locals;

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
    `).all();

    return new Response(JSON.stringify(books), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
