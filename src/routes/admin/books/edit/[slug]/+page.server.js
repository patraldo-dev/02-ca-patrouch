// src/routes/admin/books/edit/[slug]/+page.server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        throw error(404, 'Database not available');
    }

    const { slug } = params;
    console.log('Loading book with slug:', slug);

    // Check if slug is valid
    if (!slug || slug === 'undefined') {
        throw error(400, 'Invalid book slug');
    }

    // Fetch book by slug
    const bookStmt = db.prepare(`
        SELECT * FROM books WHERE slug = ?
    `);
    const { results: [book] } = await bookStmt.bind(slug).all();
    
    if (!book) {
        console.log('Book not found with exact slug, trying case-insensitive search');
        const allBooksStmt = db.prepare("SELECT * FROM books");
        const { results: allBooks } = await allBooksStmt.all();
        const caseInsensitiveMatch = allBooks.find(b => 
            b.slug && b.slug.toLowerCase() === slug.toLowerCase()
        );
        
        if (!caseInsensitiveMatch) {
            console.log('Book not found even with case-insensitive search');
            throw error(404, 'Book not found');
        }
        
        console.log('Found book with case-insensitive match:', caseInsensitiveMatch);
        return {
            book: caseInsensitiveMatch
        };
    }

    console.log('Book found:', book);
    return {
        book
    };
}
