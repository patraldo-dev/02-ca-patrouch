// src/routes/books/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    
    // Fetch all books with their average ratings and review counts
    const { results } = await db.prepare(`
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.description, 
            b.coverImageId,
            b.slug,
            b.published_year,
            AVG(r.rating) as avg_rating,
            COUNT(r.id) as review_count
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        GROUP BY b.id
        ORDER BY b.title ASC
    `).all();
    
    return {
        books: results
    };
}
