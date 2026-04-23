import { json } from '@sveltejs/kit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

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

    // Generate key and store in R2
    const ext = file.name.split('.').pop() || 'jpg';
    const uuid = crypto.randomUUID();
    const key = `avatars/${user.id}/${uuid}.${ext}`;

    await platform.env.R2_ASSETS.put(key, imageBytes, {
        httpMetadata: { contentType: file.type }
    });

    const avatarUrl = `https://assets.patrouch.ca/${key}`;

    // Update user image in D1
    const db = locals.db;
    if (db) {
        await db.prepare('UPDATE "user" SET image = ? WHERE id = ?').bind(avatarUrl, user.id).run();
    }

    return json({ url: avatarUrl });
}
