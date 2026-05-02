import { json } from '@sveltejs/kit';

export async function GET({ locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ scores: [] });

    const result = await db.prepare(`
        SELECT found_by, COUNT(*) as captures,
               MIN(found_at) as first_capture,
               MAX(found_at) as last_capture
        FROM bottles
        WHERE id LIKE 'fiesta-%' AND found_by IS NOT NULL
        GROUP BY found_by
        ORDER BY captures DESC, first_capture ASC
    `).all();

    const scores = (result.results || []).map((row, i) => ({
        rank: i + 1,
        username: row.found_by,
        captures: row.captures,
        first_capture: row.first_capture,
        last_capture: row.last_capture
    }));

    return json({ scores });
}
