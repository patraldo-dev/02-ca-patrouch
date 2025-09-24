// src/routes/api/upload-image/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
        return json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Get Cloudflare Images account hash from env
    const accountHash = '4bRSwPonOXfEIBVZiDXg0w';  
    const apiKey = platform.env.CLOUDFLARE_API_TOKEN; 

    // Upload to Cloudflare Images
    const uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountHash}/images/v1`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`
            },
            body: file
        }
    );

    const result = await uploadResponse.json();

    if (!result.success) {
        return json({ error: 'Upload failed', details: result.errors }, { status: 500 });
    }

    // Return image ID
    return json({
        imageId: result.result.id
    });
}
