// src/routes/api/upload-image/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
    try {
        const formData = await request.formData();
        const file = formData.get('image');
        
        if (!file) {
            return json({ 
                success: false, 
                error: 'No image file provided' 
            }, { status: 400 });
        }

        // Get Cloudflare credentials from environment variables
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiKey = process.env.CLOUDFLARE_API_TOKEN;
        
        if (!accountId || !apiKey) {
            return json({ 
                success: false, 
                error: 'Cloudflare credentials not configured' 
            }, { status: 500 });
        }

        // Create form data for Cloudflare Images API
        const cloudflareFormData = new FormData();
        cloudflareFormData.append('file', file);
        
        // Optional: Add metadata
        cloudflareFormData.append('metadata', JSON.stringify({
            uploadedFrom: 'book-management',
            uploadedAt: new Date().toISOString()
        }));

        // Upload to Cloudflare Images
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: cloudflareFormData,
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error('Cloudflare Images error:', result);
            return json({ 
                success: false, 
                error: result.errors?.[0]?.message || 'Failed to upload image' 
            }, { status: 500 });
        }

        // Return the image ID from Cloudflare Images
        return json({ 
            success: true, 
            imageId: result.result.id,
            variants: result.result.variants
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
