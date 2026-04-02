// src/routes/api/search/index/+server.js
// Index all public published writings into Vectorize
// POST /api/search/index - trigger indexing (auth required)

import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = platform?.env?.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ai = platform?.env?.AI;
    const vectorize = platform?.env?.VECTORIZE;
    const db = platform?.env?.DB_book;

    if (!ai || !vectorize || !db) {
        return json({ error: 'Missing bindings' }, { status: 503 });
    }

    try {
        // Get all public published writings
        const { results: writings } = await db.prepare(`
            SELECT id, title, content FROM writings
            WHERE visibility = 'public' AND status = 'published'
        `).all();

        if (!writings?.length) {
            return json({ indexed: 0, message: 'No writings to index' });
        }

        // Generate embeddings in batches of 10
        const batchSize = 10;
        let indexed = 0;
        const errors = [];

        for (let i = 0; i < writings.length; i += batchSize) {
            const batch = writings.slice(i, i + batchSize);
            const texts = batch.map(w => `${w.title}\n${w.content || ''}`);

            try {
                const embedding = await ai.run('@cf/baai/bge-m3', {
                    text: texts,
                    input_type: 'document'
                });

                const vectors = embedding?.data || [];
                const ids = batch.map(w => w.id);

                // Upsert vectors
                const vectorsToInsert = ids.map((id, idx) => ({
                    id,
                    values: vectors[idx],
                    metadata: { title: batch[idx].title }
                }));

                await vectorize.upsert(vectorsToInsert);
                indexed += batch.length;
            } catch (err) {
                errors.push({ batch: Math.floor(i / batchSize), error: err.message });
            }
        }

        return json({
            indexed,
            total: writings.length,
            errors: errors.length,
            details: errors
        });
    } catch (error) {
        console.error('Index error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
