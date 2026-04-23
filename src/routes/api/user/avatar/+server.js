// POST /api/user/avatar — Upload avatar via Cloudflare Images REST API + AI moderation
import { json } from '@sveltejs/kit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const CF_ACCOUNT_ID = '477082f5c9678c608889bd8f03f7b807';
const CF_IMAGES_UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`;

export async function POST({ locals, request, platform }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('avatar');
    if (!file || !(file instanceof File)) {
        return json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return json({ error: 'Only jpg, png, and webp images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return json({ error: 'Image must be under 2MB' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const imageBytes = new Uint8Array(buffer);

    // AI moderation via Workers AI
    try {
        const ai = platform?.env?.AI;
        if (ai) {
            const result = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                image: Array.from(imageBytes),
                prompt: 'You are a content moderator. Look at this image and determine if it is appropriate for a public profile picture. Inappropriate content includes nudity, violence, hate symbols, or explicit material. Answer only YES if it is appropriate, or NO if it is inappropriate. Do not explain.',
                max_tokens: 1
            });
            const answer = (result?.response || '').toUpperCase().trim();
            if (answer.startsWith('NO')) {
                return json({ error: 'Image failed content moderation' }, { status: 400 });
            }
        }
    } catch (e) {
        console.error('AI moderation failed:', e);
        // Fail open: allow image if moderation is unavailable
    }

    // Upload to Cloudflare Images via REST API
    try {
        const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN;
        if (!apiToken) {
            return json({ error: 'Image service not configured' }, { status: 503 });
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const imageId = `avatar-${user.id}`;

        // CF Images requires multipart/form-data with specific field names
        const uploadForm = new FormData();
        uploadForm.append('file', file, `${imageId}.${ext}`);
        uploadForm.append('id', imageId);
        uploadForm.append('metadata', JSON.stringify({
            userId: user.id,
            type: 'avatar',
            uploadedAt: new Date().toISOString()
        }));
        // Require approval=false for auto-delivery
        uploadForm.append('requireSignedURLs', 'false');

        const response = await fetch(CF_IMAGES_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
            },
            body: uploadForm,
        });

        const result = await response.json();

        if (!result.success) {
            console.error('CF Images upload error:', JSON.stringify(result.errors));
            return json({ error: 'Failed to upload image' }, { status: 500 });
        }

        // Get the variants — use the first variant URL
        const imageData = result.result;
        const variant = imageData?.variants?.[0];

        // Fallback: construct delivery URL from image ID
        const avatarUrl = variant || `https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${imageId}/avatar200`;

        // Update user image in D1
        const db = locals.db;
        if (db) {
            await db.prepare('UPDATE "user" SET image = ? WHERE id = ?').bind(avatarUrl, user.id).run();
        }

        return json({ url: avatarUrl, imageId: imageData?.id || imageId });

    } catch (e) {
        console.error('CF Images upload failed:', e.message);
        return json({ error: 'Failed to upload image: ' + e.message }, { status: 500 });
    }
}
