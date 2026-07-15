/**
 * POST /api/materialize
 *
 * Takes raw text from the user, distills it into a 3D scene config via Mistral,
 * and returns the config so the client can boot a realm from the user's words.
 *
 * This is the "write → see it materialize" shortcut: no DB writes, no portal
 * creation, no saved writing. Pure ephemeral generation — the scene exists for
 * the session and is gone when the visitor leaves. The teaser that makes the
 * portals compelling and immediate.
 *
 * No auth required — anyone can try it. (Saving as a permanent portal is a
 * future member-gated feature via the Workshop /materialize route.)
 *
 * AI: platform.env.AI binding (@cf/mistralai/mistral-small-3.1-24b-instruct)
 *
 * Body: { "text": "string (min 20 chars)", "locale": "es|en|fr" }
 * Response: { "portalId": "materialized-<uuid>", "sceneConfig": {...} }
 */
import { json } from '@sveltejs/kit';
import { generateSceneForPortal } from '$lib/server/scene-generator.js';

const MIN_CHARS = 20;
const MAX_CHARS = 5000;

export async function POST({ request, platform }) {
    const ai = platform?.env?.AI;
    if (!ai) return json({ error: 'AI not available' }, { status: 503 });

    let body;
    try { body = await request.json(); } catch { body = {}; }

    const text = (body.text || '').trim();
    const locale = body.locale || 'es';

    if (text.length < MIN_CHARS) {
        return json({ error: `Write at least ${MIN_CHARS} characters` }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
        return json({ error: `Keep it under ${MAX_CHARS} characters` }, { status: 400 });
    }

    // Synthesize a minimal portal object + a single source "writing" from the
    // raw text. generateSceneForPortal extracts excerpts and feeds Mistral.
    const portalId = `materialized-${crypto.randomUUID().slice(0, 8)}`;
    const portal = {
        id: portalId,
        name_es: 'Tu reino',
        name_en: 'Your realm',
        icon: '✨',
        color_primary: '#c9a87c',
        color_bg: '#05030a',
    };

    const sourceWritings = [{
        id: 'user-text',
        title: 'Your words',
        content: text,
        locale,
    }];

    try {
        const { sceneConfig } = await generateSceneForPortal(ai, portal, sourceWritings);

        // Ensure the generated realm has portal_links to the existing worlds so
        // the visitor can navigate onward after exploring their materialized realm.
        if (!sceneConfig.portal_links || !sceneConfig.portal_links.length) {
            sceneConfig.portal_links = [
                { target: 'arboleda', label: 'Otros mundos' },
                { target: 'cosmos', label: 'Cosmos' },
            ];
        }

        return json({ portalId, sceneConfig });
    } catch (e) {
        console.error('[materialize] generation failed:', e.message);
        return json({ error: 'Failed to materialize. Try again.' }, { status: 500 });
    }
}
