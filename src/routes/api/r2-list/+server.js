// Temp: list R2 objects
export async function GET({ platform, url }) {
    const r2 = platform?.env?.R2_ASSETS;
    if (!r2) return new Response('No R2', { status: 500 });

    const listed = await r2.list({ limit: 1000 });
    const objects = listed.objects || [];
    const glbs = objects.filter(o => o.key.toLowerCase().endsWith('.glb'));

    return new Response(JSON.stringify({
        total: objects.length,
        glbs: glbs.map(g => ({ key: g.key, size: g.size })),
        all_keys: objects.map(o => ({ key: o.key, size: o.size })).slice(0, 100)
    }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}
