import { json } from "@sveltejs/kit";
async function GET({ params, platform }) {
  try {
    if (!platform?.env?.DB_book) {
      return json({
        success: false,
        error: "Database not available"
      }, { status: 500 });
    }
    const { slug } = params;
    console.log("Fetching book with slug:", slug);
    const result = await platform.env.DB_book.prepare("SELECT * FROM books WHERE slug = ?").bind(slug).first();
    if (!result) {
      console.log("Book not found for slug:", slug);
      return json({
        success: false,
        error: "Book not found"
      }, { status: 404 });
    }
    console.log("Book found:", result);
    return json(result);
  } catch (error) {
    console.error("Error fetching book:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
export {
  GET
};
