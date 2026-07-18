/**
 * POST /api/assets/upload
 *
 * Upload a GLB file to R2. Used by the admin asset library page
 * so models can be added entirely through the browser — no wrangler CLI.
 *
 * Accepts multipart/form-data with:
 *   - file: the .glb file
 *   - kind: the element kind (determines the subfolder)
 *   - filename: optional custom filename (default: original name)
 *
 * Stores at: models/{kind}/{filename}
 * Returns: { success: true, file_path: "models/figure/my-model.glb" }
 *
 * Admin-only.
 */
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role.js';

export async function POST({ request, locals, platform, url }) {
    try {
        await requireRole(locals, ['admin'], url);
    } catch (e) {
        if (e?.status === 303) return json({ error: 'Unauthorized' }, { status: 401 });
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const r2 = platform?.env?.R2_ASSETS;
    if (!r2) return json({ error: 'R2 not configured' }, { status: 503 });

    const formData = await request.formData();
    const file = formData.get('file');
    const kind = formData.get('kind') || 'object';
    const customName = formData.get('filename');

    if (!file || !(file instanceof File)) {
        return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate it's a GLB
    const originalName = file.name;
    if (!originalName.toLowerCase().endsWith('.glb') && file.type !== 'model/gltf-binary') {
        return json({ error: 'File must be a .glb file' }, { status: 400 });
    }

    // Build the R2 key
    const safeKind = kind.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const fileName = customName || originalName;
    const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    const r2Key = `models/scene-elements/${safeName}`;

    try {
        const arrayBuffer = await file.arrayBuffer();
        await r2.put(r2Key, arrayBuffer, {
            httpMetadata: { contentType: 'model/gltf-binary' },
        });

        return json({
            success: true,
            file_path: r2Key,
            size: arrayBuffer.byteLength,
        });
    } catch (e) {
        console.error('[assets/upload] R2 put error:', e.message);
        return json({ error: 'Failed to upload: ' + e.message }, { status: 500 });
    }
}
