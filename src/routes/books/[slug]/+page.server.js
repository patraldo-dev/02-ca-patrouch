// src/routes/books/[slug]/+page.server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform, locals }) {
  const { slug } = params;
  
  if (!platform?.env?.DB_book) {
    throw error(500, 'Database not available');
  }
  
  const db = platform.env.DB_book;
  
  // Fetch the specific book by slug
  const { results: bookResults } = await db.prepare(`
    SELECT 
      b.id, 
      b.title, 
      b.author, 
      b.description, 
      b.coverImageId,
      b.slug,
      b.published_year,
      b.published,
      AVG(r.rating) as avg_rating,
      COUNT(r.id) as review_count
    FROM books b
    LEFT JOIN reviews r ON b.id = r.book_id
    WHERE b.slug = ?
    GROUP BY b.id
  `).bind(slug).all();
  
  if (!bookResults || bookResults.length === 0) {
    throw error(404, 'Book not found');
  }
  
  const book = bookResults[0];
  
  // Fetch reviews for this book
  const { results: reviewResults } = await db.prepare(`
    SELECT 
      r.id,
      r.content,
      r.rating,
      r.created_at,
      u.username as author_username,
      u.id as author_id
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
  `).bind(book.id).all();
  
  book.reviews = reviewResults;
  
  return {
    book,
    user: locals.user || null
  };
}
