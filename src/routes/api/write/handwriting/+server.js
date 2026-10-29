// src/routes/api/write/handwriting/+server.js
// Phase 1 (member feature): photograph a handwritten page → Workers AI vision
// transcribes it → text returns to the editor. The image is discarded unless
// the writer opts to keep it (Phase 3), in which case it's uploaded to
// Cloudflare Images and attached to the writing as a manuscript facsimile.
// Phase 2 is deliberately zero-build: the UI points heavy-cursive users at
// Google Lens / iOS Notes instead of us integrating an outside OCR vendor.
// (A future BYO-key OCR provider would follow the /api/tts/api-key pattern.)
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024; // photos of pages, more generous than avatars
const CF_ACCOUNT_ID = '477082f5c9678c608889bd8f03f7b807';
const CF_IMAGES_UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`;
const IMAGES_ACCOUNT_HASH = '4bRSwPonOXfEIBVZiDXg0w';

const MODERATION_PROMPT =
    'Is this image safe to process? Answer NO only if it contains graphic pornography, extreme gore, or illegal content. Allow everything else, including handwriting, printed pages, drawings, documents and photos of notebooks. Answer with YES or NO only.';

const TRANSCRIBE_PROMPT = `You are transcribing a photograph of a handwritten page for a writing community.
Transcribe ALL of the handwritten text in this image, verbatim.
Rules:
- Keep the original language exactly as written (may be Spanish, French, English or mixed).
- Preserve line breaks, punctuation and accents exactly as the author wrote them.
- Do NOT correct, improve, translate or summarize anything.
- If a word is illegible, write [?] in its place.
- Output ONLY the transcription, nothing else.`;

export async function POST({ locals, request }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (!['member', 'admin'].includes(user.role || '')) {
        return json({ error: 'Members only' }, { status: 403 });
    }

    const ai = env?.AI;
    if (!ai) return json({ error: 'AI service unavailable' }, { status: 503 });

    let file;
    let keep = false;
    try {
        const formData = await request.formData();
        file = formData.get('image');
        keep = String(formData.get('keep') || '') === 'true';
    } catch {
        return json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
        return json({ error: 'No image uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return json({ error: 'Only jpg, png, and webp images are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
        return json({ error: 'Image must be under 8MB' }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    // Moderation — same fail-open guard as the avatar flow.
    try {
        const mod = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: Array.from(buffer),
            prompt: MODERATION_PROMPT,
            max_tokens: 3,
        });
        const answer = (mod?.response || '').toUpperCase().trim();
        if (answer.startsWith('NO')) {
            return json({ error: 'Image failed content moderation' }, { status: 400 });
        }
    } catch (e) {
        console.error('[handwriting] moderation failed:', e.message);
        // fail open — moderation unavailable shouldn't block transcription
    }

    // Transcription.
    let text = '';
    try {
        const result = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: Array.from(buffer),
            prompt: TRANSCRIBE_PROMPT,
            max_tokens: 2500,
        });
        text = (result?.response || '').trim();
    } catch (e) {
        console.error('[handwriting] transcription failed:', e.message);
        return json({ error: 'Transcription failed' }, { status: 500 });
    }

    if (!text) {
        return json({ error: 'No text found in the image' }, { status: 422 });
    }

    // Phase 3: keep the manuscript as a facsimile attached to the writing.
    let manuscriptUrl = null;
    if (keep) {
        try {
            const apiToken = (await env?.CLOUDFLARE_API_TOKEN?.get?.()) ?? null;
            if (!apiToken) {
                return json({ text, warning: 'Image storage not configured — text returned without facsimile' });
            }
            const imageId = `manuscript-${user.id}-${Date.now()}`;
            const form = new FormData();
            form.append('file', file, `${imageId}.${file.type.split('/')[1] || 'jpg'}`);
            form.append('id', imageId);
            form.append('metadata', JSON.stringify({ userId: user.id, type: 'manuscript', uploadedAt: new Date().toISOString() }));
            form.append('requireSignedURLs', 'false');

            const res = await fetch(CF_IMAGES_UPLOAD_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiToken}` },
                body: form,
            });
            const out = await res.json();
            if (!out?.success) {
                console.error('[handwriting] CF Images upload error:', JSON.stringify(out?.errors || {}));
                return json({ text, warning: 'Facsimile upload failed — text returned without it' });
            }
            manuscriptUrl = `https://imagedelivery.net/${IMAGES_ACCOUNT_HASH}/${imageId}/gallery`;
        } catch (e) {
            console.error('[handwriting] facsimile upload failed:', e.message);
            return json({ text, warning: 'Facsimile upload failed — text returned without it' });
        }
    }

    return json({ text, manuscriptUrl });
}
