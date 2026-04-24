// POST /api/user/avatar/generate — Generate AI avatar via CF Workers AI
import { json } from '@sveltejs/kit';

export async function POST({ locals, request, platform }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

    const prompt = body.prompt?.trim();
    if (!prompt || prompt.length < 3) {
        return json({ error: 'Prompt too short' }, { status: 400 });
    }
    if (prompt.length > 200) {
        return json({ error: 'Prompt too long (max 200 chars)' }, { status: 400 });
    }

    const ai = platform?.env?.AI;
    if (!ai) return json({ error: 'AI service not available' }, { status: 503 });

    try {
        console.log('[AI Avatar] Generating with prompt:', prompt);
        // Enhance prompt for avatar generation
        const enhancedPrompt = `cartoon portrait avatar of ${prompt}, simple flat illustration style, clean background, profile picture, high quality`;

        console.log('[AI Avatar] Enhanced prompt:', enhancedPrompt);
        const result = await ai.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
            prompt: enhancedPrompt,
            num_steps: 20,
            guidance: 7.5,
            width: 512,
            height: 512,
        });
        console.log('[AI Avatar] AI result keys:', Object.keys(result), 'image type:', typeof result.image, 'is Uint8Array:', result.image instanceof Uint8Array);

        // result.image is a base64 string or Uint8Array
        let imageBytes;
        if (result.image instanceof Uint8Array) {
            imageBytes = result.image;
        } else if (typeof result.image === 'string') {
            const binaryStr = atob(result.image);
            imageBytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) imageBytes[i] = binaryStr.charCodeAt(i);
        } else if (result.image instanceof ArrayBuffer) {
            imageBytes = new Uint8Array(result.image);
        } else if (result.image && typeof result.image === 'object' && result.image.data) {
            // Cloudflare Workers AI might return { image: { data: [...], shape: [...] } }
            imageBytes = new Uint8Array(result.image.data);
        } else {
            console.error('[AI Avatar] Unexpected image format:', typeof result.image, JSON.stringify(result).substring(0, 200));
            return json({ error: 'Invalid image format from AI: ' + typeof result.image }, { status: 500 });
        }
        console.log('[AI Avatar] Image bytes length:', imageBytes.length);

        // Upload to Cloudflare Images
        const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN;
        const CF_ACCOUNT_ID = '477082f5c9678c608889bd8f03f7b807';
        const imageId = `avatar-${user.id}-${Date.now()}`;
        const blob = new Blob([imageBytes], { type: 'image/png' });

        const uploadForm = new FormData();
        uploadForm.append('file', blob, `${imageId}.png`);
        uploadForm.append('id', imageId);
        uploadForm.append('metadata', JSON.stringify({
            userId: user.id,
            type: 'ai-avatar',
            prompt: prompt,
            generatedAt: new Date().toISOString()
        }));
        uploadForm.append('requireSignedURLs', 'false');

        const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiToken}` },
                body: uploadForm,
            }
        );

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
            console.error('CF Images upload error:', JSON.stringify(uploadResult.errors));
            // Fallback: return base64 directly
            const base64 = typeof result.image === 'string' ? result.image : btoa(String.fromCharCode(...imageBytes));
            return json({ url: `data:image/png;base64,${base64}`, fallback: true });
        }

        const avatarUrl = uploadResult.result?.variants?.[0] ||
            `https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${imageId}/avatar200`;

        // Update user image in D1
        const db = locals.db;
        if (db) {
            await db.prepare('UPDATE "user" SET image = ? WHERE id = ?').bind(avatarUrl, user.id).run();
        }

        return json({ url: avatarUrl, imageId: uploadResult.result?.id || imageId });

    } catch (e) {
        console.error('AI avatar generation failed:', e.message);
        return json({ error: 'Failed to generate avatar: ' + e.message }, { status: 500 });
    }
}
