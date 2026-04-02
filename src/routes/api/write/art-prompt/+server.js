// src/routes/api/write/art-prompt/+server.js
import { json } from '@sveltejs/kit';
import { getDailyArtwork, getImageUrl } from '$lib/server/art-prompt.js';

export async function GET({ locals, url }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const ai = locals.platform?.env?.AI;
    if (!ai) return json({ error: 'AI not available' }, { status: 503 });

    const locale = url.searchParams.get('locale') || 'en';
    const artwork = getDailyArtwork();

    const localeInstructions = {
        en: 'Write the prompt in English.',
        es: 'Escribe el prompt en español.',
        fr: 'Écris le prompt en français.',
    };

    try {
        const response = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: artwork.imageUrl } },
                        { type: 'text', text: `Look at this artwork and craft a single, evocative writing prompt (1-2 sentences) inspired by it. The prompt should be open-ended and invite the writer to explore emotions, stories, or perspectives suggested by the image. ${localeInstructions[locale] || localeInstructions.en}` }
                    ]
                }
            ],
            max_tokens: 200,
        });

        // Mistral returns response as string directly or in .response
        const promptText = typeof response === 'string' ? response : (response?.response || response?.[0]?.response || JSON.stringify(response));

        return json({
            artwork,
            prompt: promptText.trim(),
            promptSource: 'visual',
        });
    } catch (err) {
        console.error('Vision prompt error:', err);
        return json({ error: 'Failed to generate: ' + err.message }, { status: 500 });
    }
}
