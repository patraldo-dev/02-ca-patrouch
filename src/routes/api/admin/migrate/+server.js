// src/routes/api/admin/migrate/+server.js
import { addSlugColumn, addPublishedColumn } from '$lib/db/simple-migration.js';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    const slugResult = await addSlugColumn();
    if (!slugResult.success) {
      return json(slugResult);
    }
    
    const publishedResult = await addPublishedColumn();
    return json(publishedResult);
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
