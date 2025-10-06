// src/routes/+page.server.js
export async function load({ platform }) {
  if (!platform?.env?.DB_book) return { books: [] };
  
  const db = platform.env.DB_book;
  const { results } = await db.prepare(`
    SELECT id, title, slug, author, coverImageId, avg_rating, review_count
    FROM books 
    WHERE published = 1 AND coverImageId IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 12
  `).all();

  return { books: results };
}
