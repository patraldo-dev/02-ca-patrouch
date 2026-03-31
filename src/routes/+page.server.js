import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const db = locals?.db;
    const ai = locals?.platform?.env?.AI;
    const user = locals?.user || null;

    // Get the community prompt to tease on the landing page (no auth needed)
    let communityPrompt = null;
    if (db && ai) {
        try {
            const { getOrCreateCommunityPrompt } = await import('$lib/server/prompt-generator.js');
            const today = new Date().toISOString().slice(0, 10);
            const locale = locals.locale || 'es';
            communityPrompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
        } catch (e) {
            // Silent fail — prompt is just a teaser
        }
    }

    return { user, communityPrompt };
}
