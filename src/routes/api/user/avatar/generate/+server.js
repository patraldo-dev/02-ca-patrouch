// POST /api/user/avatar/generate — Generate AI avatar via CF Workers AI (Flux Schnell)
import { json } from '@sveltejs/kit';

const CF_ACCOUNT_ID = '477082f5c9678c608889bd8f03f7b807';

export async function POST({ locals, request, platform }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

    const prompt = body.prompt?.trim();
    if (!prompt || prompt.length < 3) return json({ error: 'Prompt too short' }, { status: 400 });
    if (prompt.length > 200) return json({ error: 'Prompt too long (max 200 chars)' }, { status: 400 });

    const ai = platform?.env?.AI;
    if (!ai) return json({ error: 'AI service not available' }, { status: 503 });

    try {
        const enhancedPrompt = `cartoon portrait avatar of ${prompt}, simple flat illustration style, clean white background, perfect circle, high quality, profile picture`;

        const result = await ai.run('@cf/black-forest-labs/flux-1-schnell', {
            prompt: enhancedPrompt,
            width: 512,
            height: 512,
            steps: 4,
            seed: Math.floor(Math.random() * 2 ** 32),
        });

        // result.image is base64 PNG string
        const imageData = result.image;
        if (!imageData || imageData === '{}') {
            console.error('[AI Avatar] Empty image, full result:', JSON.stringify(result).substring(0, 200));
            return json({ error: 'AI did not generate an image' }, { status: 500 });
        }

        const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
        const blob = new Blob([imageBytes], { type: 'image/png' });

        // Upload to Cloudflare Images
        const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN;
        const imageId = `avatar-${user.id}-${Date.now()}`;

        const uploadForm = new FormData();
        uploadForm.append('file', blob, `${imageId}.png`);
        uploadForm.append('id', imageId);
        uploadForm.append('requireSignedURLs', 'false');
        uploadForm.append('metadata', JSON.stringify({
            userId: user.id, type: 'ai-avatar', prompt, generatedAt: new Date().toISOString()
        }));

        const uploadRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
            { method: 'POST', headers: { 'Authorization': `Bearer ${apiToken}` }, body: uploadForm }
        );
        const uploadResult = await uploadRes.json();

        if (!uploadResult.success) {
            console.error('[AI Avatar] Upload failed:', JSON.stringify(uploadResult.errors));
            // Fallback: return base64 data URL
            return json({ url: `data:image/png;base64,${imageData}`, fallback: true });
        }

        const avatarUrl = uploadResult.result?.variants?.find(v => v.includes('avatar200'))
            || `https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${uploadResult.result.id}/avatar200`;

        // Save to D1
        const db = locals.db;
        if (db) {
            await db.prepare('UPDATE "user" SET image = ? WHERE id = ?').bind(avatarUrl, user.id).run();
        }

        return json({ url: avatarUrl, imageId: uploadResult.result.id });
    } catch (e) {
        console.error('[AI Avatar] Failed:', e.message, e.stack?.substring(0, 300));
        return json({ error: 'Failed to generate avatar: ' + e.message }, { status: 500 });
    }
}
