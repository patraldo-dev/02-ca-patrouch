// src/routes/api/admin/migrate/+server.js
import { addSlugColumn, addPublishedColumn } from '$lib/db/simple-migration.js';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    // First add the slug column
    const slugResult = await addSlugColumn();
    if (!slugResult.success) {
      return json(slugResult, { status: 500 });
    }
    
    // Then add the published column
    const publishedResult = await addPublishedColumn();
    if (!publishedResult.success) {
      return json(publishedResult, { status: 500 });
    }
    
    return json({ success: true, message: 'All migrations completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
