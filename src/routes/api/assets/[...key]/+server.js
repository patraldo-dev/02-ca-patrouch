// Serve R2 objects with proper content-type — catch-all for nested keys like models/spirit.glb
export async function GET({ params, platform }) {
    const r2 = platform?.env?.R2_ASSETS;
    if (!r2) return new Response('R2 not configured', { status: 500 });

    const key = params.key;
    const object = await r2.get(key);

    if (!object) return new Response('Not found: ' + key, { status: 404 });

    const ext = key.split('.').pop()?.toLowerCase();
    const types = {
        'glb': 'model/gltf-binary',
        'gltf': 'model/gltf+json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'json': 'application/json',
        'txt': 'text/plain',
    };
    const contentType = types[ext] || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
}
