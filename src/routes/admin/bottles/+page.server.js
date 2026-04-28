export async function load({ locals }) {
    const db = locals.db;
    const result = await db.prepare(`
        SELECT id, title, status, launch_lat, launch_lon, current_lat, current_lon,
               launched_at, found_by, found_at
        FROM bottles 
        WHERE bottle_type = 'physical'
        ORDER BY created_at DESC
    `).all();

    return { bottles: result.results || [] };
}
