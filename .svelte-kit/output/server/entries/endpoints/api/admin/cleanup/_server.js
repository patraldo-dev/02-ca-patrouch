import { json } from "@sveltejs/kit";
async function POST({ platform }) {
  try {
    if (!platform?.env?.DB_book) {
      return json({
        success: false,
        error: "Database not available"
      }, { status: 500 });
    }
    const result = await platform.env.DB_book.prepare("DELETE FROM books WHERE title = 'Your Book Title' AND author = 'Author Name'").run();
    const result2 = await platform.env.DB_book.prepare("DELETE FROM books WHERE id = 'book-123'").run();
    return json({
      success: true,
      message: `Removed ${result.changes + result2.changes} auto-generated books`
    });
  } catch (error) {
    console.error("Error cleaning up books:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
export {
  POST
};
