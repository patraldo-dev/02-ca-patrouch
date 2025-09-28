/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform }) {
  const { slug } = params;
  
  if (!platform?.env?.DB_book) {
    throw error(500, 'Database not available');
  }
  
  const db = platform.env.DB_book;
  
  // Fetch the specific book by slug
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
    WHERE b.slug = ?
    GROUP BY b.id
  `).bind(slug).all();
  
  if (!results || results.length === 0) {
    throw error(404, 'Book not found');
  }
  
  return {
    book: results[0]
  };
}
