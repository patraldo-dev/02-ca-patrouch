import { json } from "@sveltejs/kit";
async function POST({ platform }) {
  try {
    if (!platform?.env?.DB_book) {
      return json({
        success: false,
        error: "Database not available"
      }, { status: 500 });
    }
    const schema = await platform.env.DB_book.prepare("PRAGMA table_info(books);").all();
    const tableExists = await platform.env.DB_book.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books';").all();
    if (tableExists.results.length === 0) {
      await platform.env.DB_book.exec(`
                CREATE TABLE books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    description TEXT,
                    published_year INTEGER,
                    slug TEXT NOT NULL UNIQUE,
                    published INTEGER DEFAULT 0,
                    coverImageId TEXT
                )
            `);
      return json({
        success: true,
        message: "Created books table with proper schema"
      });
    }
    const columns = schema.results;
    const hasIdColumn = columns.some((col) => col.name === "id" && col.type === "INTEGER");
    const hasSlugColumn = columns.some((col) => col.name === "slug");
    const hasPublishedColumn = columns.some((col) => col.name === "published");
    let changes = [];
    if (!hasSlugColumn) {
      await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN slug TEXT;");
      changes.push("Added slug column");
    }
    if (!hasPublishedColumn) {
      await platform.env.DB_book.exec("ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;");
      changes.push("Added published column");
    }
    if (!hasIdColumn) {
      const existingData = await platform.env.DB_book.prepare("SELECT * FROM books").all();
      await platform.env.DB_book.exec("DROP TABLE books;");
      await platform.env.DB_book.exec(`
                CREATE TABLE books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    description TEXT,
                    published_year INTEGER,
                    slug TEXT NOT NULL UNIQUE,
                    published INTEGER DEFAULT 0,
                    coverImageId TEXT
                )
            `);
      for (const book of existingData.results) {
        await platform.env.DB_book.prepare(`
                    INSERT INTO books (title, author, description, published_year, slug, published, coverImageId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
          book.title,
          book.author,
          book.description,
          book.published_year,
          book.slug || createSlug(book.title),
          book.published || 0,
          book.coverImageId
        ).run();
      }
      changes.push("Fixed table schema");
    }
    const promptLogTable = await platform.env.DB_book.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_prompt_log';").first();
    if (promptLogTable) {
      const promptLogInfo = await platform.env.DB_book.prepare("PRAGMA table_info(daily_prompt_log);").all();
      const hasIsCommunity = promptLogInfo.results.some((c) => c.name === "is_community");
      if (!hasIsCommunity) {
        await platform.env.DB_book.exec("ALTER TABLE daily_prompt_log ADD COLUMN is_community INTEGER DEFAULT 1;");
        changes.push("Added is_community column to daily_prompt_log");
      }
    }
    const writingsTable = await platform.env.DB_book.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='writings';").first();
    if (writingsTable) {
      const writingsInfo = await platform.env.DB_book.prepare("PRAGMA table_info(writings);").all();
      const cols = writingsInfo.results.map((c) => c.name);
      if (!cols.includes("locale")) {
        await platform.env.DB_book.exec("ALTER TABLE writings ADD COLUMN locale TEXT DEFAULT 'en';");
        changes.push("Added locale column to writings");
      }
      if (!cols.includes("category")) {
        await platform.env.DB_book.exec("ALTER TABLE writings ADD COLUMN category TEXT;");
        changes.push("Added category column to writings");
      }
    }
    return json({
      success: true,
      message: changes.length > 0 ? `Schema fixed: ${changes.join(", ")}` : "Schema is already correct",
      schema: schema.results
    });
  } catch (error) {
    console.error("Error fixing schema:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
function createSlug(title) {
  return title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
export {
  POST
};
