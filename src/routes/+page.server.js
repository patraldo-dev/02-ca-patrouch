// src/routes/+page.server.js
export async function load({ platform }) {
    if (!platform?.env?.DB_book) {
        return { books: [] };
    }
    
    const db = platform.env.DB_book;
    
    try {
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
            WHERE b.title IS NOT NULL 
                AND b.title != ''
                AND b.author IS NOT NULL 
                AND b.author != ''
            GROUP BY b.id
            ORDER BY b.title ASC
        `).all();
        
        return { books: results };
    } catch (error) {
        console.error('Error fetching books:', error);
        return { books: [] };
    }
}
