import { json } from "@sveltejs/kit";
async function POST({ platform }) {
  try {
    if (!platform?.env?.DB_book) {
      return json({
        success: false,
        error: "Database not available. Check your D1 binding configuration."
      }, { status: 500 });
    }
    const tableInfo = await platform.env.DB_book.prepare("PRAGMA table_info(books);").all();
    const hasSlugColumn = tableInfo.results.some((column) => column.name === "slug");
    if (!hasSlugColumn) {
      await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN slug TEXT;");
      await platform.env.DB_book.exec("UPDATE books SET slug = 'the-only-book' WHERE id = 1;");
    }
    const hasPublishedColumn = tableInfo.results.some((column) => column.name === "published");
    if (!hasPublishedColumn) {
      await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;");
      await platform.env.DB_book.exec("UPDATE books SET published = 1 WHERE id = 1;");
    }
    return json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("Migration error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
export {
  POST
};
