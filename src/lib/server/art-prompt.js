// src/lib/server/art-prompt.js
const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';

// Will be populated from DB or hardcoded list — for now a curated subset
const ARTWORK_POOL = [
    { id: 'f8a136eb-363e-4a24-0f54-70bb4f4bf800', title: 'Mujer' },
    { id: '26fe40df-7745-41dc-7491-97cb36a32f00', title: 'Blue Alien King' },
    { id: '75b29e1a-2d22-4ef7-af19-2f7e3828bd00', title: 'Green Alien King' },
    { id: '65dfe0b8-5b3f-4501-a3ee-c99d301a1800', title: 'Yellow Alien King' },
    { id: 'd4969f09-777d-46a4-f167-db56837e5300', title: 'Brown Alien King' },
];

export function getImageUrl(imageId, variant = 'gallery') {
    return `https://imagedelivery.net/${CF_IMAGES_HASH}/${imageId}/${variant}`;
}

export function getDailyArtwork() {
    const today = new Date();
    const cst = new Date(today.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const dayOfYear = Math.floor((cst - new Date(cst.getFullYear(), 0, 0)) / 86400000);
    const index = dayOfYear % ARTWORK_POOL.length;
    const artwork = ARTWORK_POOL[index];
    return {
        imageUrl: getImageUrl(artwork.id, 'gallery'),
        title: artwork.title,
        credit: 'Antoine Patraldo',
        imageId: artwork.id,
    };
}

/**
 * Use Workers AI vision model to generate a writing prompt from an artwork image.
 */
export async function generatePromptFromImage(ai, imageUrl, locale = 'en') {
    const localeInstructions = {
        en: 'Write the prompt in English.',
        es: 'Escribe el prompt en español.',
        fr: 'Écris le prompt en français.',
    };

    const systemPrompt = `You are a creative writing prompt generator. Look at this artwork and craft a single, evocative writing prompt inspired by it. The prompt should be 1-2 sentences, open-ended, and invite the writer to explore emotions, stories, or perspectives suggested by the image. ${localeInstructions[locale] || localeInstructions.en}`;

    try {
        // Workers AI can't reach imagedelivery.net — fetch image and send as base64
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error('Failed to fetch image');
        const imgBuf = await imgRes.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
        const dataUrl = `data:image/jpeg;base64,${b64}`;

        // Accept Llama 3.2 license via prompt format
        await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', { prompt: 'agree' });

        const response = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'image', image: [{ url: dataUrl }] },
                        { type: 'text', text: 'Generate a creative writing prompt inspired by this artwork.' }
                    ]
                }
            ],
            max_tokens: 200,
        });

        const text = response?.response || response?.[0]?.response || '';
        return text.trim();
    } catch (err) {
        console.error('Vision model error:', err.message);
        return null;
    }
}

export { ARTWORK_POOL };
