// POST /api/bottlequest/drift/simulate — Run drift simulation for active bottles
import { json } from '@sveltejs/kit';
import { simulateDrift } from '$lib/server/drift-model.js';

export async function POST({ locals, request }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Check authorization (cron or admin)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    if (authHeader !== `Bearer ${cronSecret}` && user.role !== 'admin') {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = locals.db;
    if (!db) return json({ error: 'DB unavailable' }, { status: 500 });

    try {
        const result = await simulateDrift(db);
        return json(result);
    } catch (e) {
        console.error('[Drift] Simulation error:', e.message);
        return json({ error: 'Drift simulation failed: ' + e.message }, { status: 500 });
    }
}
