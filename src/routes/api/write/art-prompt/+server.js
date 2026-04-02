// src/routes/api/write/art-prompt/+server.js
import { json } from '@sveltejs/kit';
import { getDailyArtwork, generatePromptFromImage } from '$lib/server/art-prompt.js';

export async function GET({ locals, url }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const ai = locals.platform?.env?.AI;
    if (!ai) return json({ error: 'AI not available' }, { status: 503 });

    const locale = url.searchParams.get('locale') || 'en';
    const artwork = getDailyArtwork();

    const promptText = await generatePromptFromImage(ai, artwork.imageUrl, locale);

    if (!promptText) {
        return json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

    return json({
        artwork,
        prompt: promptText,
        promptSource: 'visual',
    });
}
