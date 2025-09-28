// src/routes/books/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
    if (!platform?.env?.DB_book) {
        throw error(500, 'Database not available');
    }
    
    const db = platform.env.DB_book;
    
    // Fetch all books without reviews for now
    const { results } = await db.prepare(`
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.description, 
            b.coverImageId,
            b.slug,
            b.published_year
        FROM books b
        ORDER BY b.title ASC
    `).all();
    
    return {
        books: results
    };
}
