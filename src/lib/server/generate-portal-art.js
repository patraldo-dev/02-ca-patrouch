/**
 * Portal art generation — flux-1-schnell → Cloudflare Images upload.
 *
 * Extracted from the avatar generator pattern (api/user/avatar/generate)
 * so the portal architect can auto-generate backdrop art for birthed portals.
 *
 * Returns the Cloudflare Images ID (for storage in portals.scene_image) or
 * null on failure (callers proceed without art — the renderer derives a
 * palette-based background when scene_image is missing).
 */

const CF_ACCOUNT_ID = '477082f5c9678c608889bd8f03f7b807';
const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';

/**
 * Generate a portal backdrop image and upload it to Cloudflare Images.
 *
 * @param {object} ai              - platform.env.AI (Workers AI binding)
 * @param {string} apiToken        - CLOUDFLARE_API_TOKEN value (for upload auth)
 * @param {object} opts
 * @param {string} opts.portalId   - slug, used as the image ID prefix
 * @param {string} opts.name       - portal display name (for the prompt)
 * @param {string} opts.envType    - environment type (forest/ocean/space/etc.)
 * @param {string} opts.primaryColor - hex color for mood
 * @param {string[]} opts.themes   - thematic keywords
 * @returns {Promise<string|null>} the Cloudflare Images ID, or null on failure
 */
export async function generatePortalArt(ai, apiToken, { portalId, name, envType, primaryColor, themes = [] }) {
	if (!ai || !apiToken) return null;

	const themeStr = themes.slice(0, 4).join(', ');
	const prompt = `abstract atmospheric backdrop for a "${name}" portal, ${envType} environment, ${themeStr}, ${primaryColor} tones, dark, ethereal, dreamlike, no text, no figures, wide landscape, high quality`;

	try {
		const result = await ai.run('@cf/black-forest-labs/flux-1-schnell', {
			prompt,
			width: 512,
			height: 512,
			steps: 4,
			seed: Math.floor(Math.random() * 2 ** 32),
		});

		const imageData = result.image;
		if (!imageData || imageData === '{}') {
			console.error('[portal-art] AI returned empty image for', portalId);
			return null;
		}

		const imageBytes = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));
		const blob = new Blob([imageBytes], { type: 'image/png' });
		const imageId = `portal-${portalId}-${Date.now()}`;

		const uploadForm = new FormData();
		uploadForm.append('file', blob, `${imageId}.png`);
		uploadForm.append('id', imageId);
		uploadForm.append('requireSignedURLs', 'false');
		uploadForm.append('metadata', JSON.stringify({
			type: 'portal-art',
			portalId,
			envType,
			generatedAt: new Date().toISOString(),
		}));

		const uploadRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
			{ method: 'POST', headers: { Authorization: `Bearer ${apiToken}` }, body: uploadForm },
		);
		const uploadResult = await uploadRes.json();

		if (!uploadResult.success) {
			console.error('[portal-art] Upload failed for', portalId, ':', JSON.stringify(uploadResult.errors));
			return null;
		}

		const returnedId = uploadResult.result?.id || imageId;
		console.log('[portal-art] Generated + uploaded for', portalId, '→', returnedId);
		return returnedId;
	} catch (err) {
		console.error('[portal-art] Failed for', portalId, ':', err.message);
		return null;
	}
}

/**
 * Build the imagedelivery.net URL for a stored Cloudflare Images ID + variant.
 */
export function portalArtUrl(imageId, variant = 'segment=foreground,width=512') {
	if (!imageId) return null;
	return `https://imagedelivery.net/${CF_IMAGES_HASH}/${imageId}/${variant}`;
}
