// src/routes/images/[imageId]/+server.js
import { redirect } from '@sveltejs/kit';

export async function GET({ params }) {
    const { imageId } = params;
    
    throw redirect(302, `https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${imageId}/cover`);
}
