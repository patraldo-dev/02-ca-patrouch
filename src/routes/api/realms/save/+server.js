/**
 * POST /api/realms/save
 *
 * Persist a materialized realm. Takes the text the user wrote + the
 * sceneConfig that Mistral generated, stores them as a personal portal
 * (galaxy_id='personal') with owner_id + visibility, and saves the scene
 * config in portal_scenes.
 *
 * Mirrors the writings privacy pattern: default 'private', toggleable
 * to 'public' for sharing via URL.
 *
 * Auth required (Pattern A — locals.user).
 *
 * Body: { text: string, sceneConfig: object, visibility?: 'private'|'public' }
 * Response: { slug: string, url: string }
 */
import { json } from '@sveltejs/kit';

const MAX_TEXT = 5000;

export async function POST({ request, locals, platform }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const text = (body.text || '').trim();
    const sceneConfig = body.sceneConfig;
    const visibility = body.visibility === 'public' ? 'public' : 'private';

    if (!text || text.length < 20) {
        return json({ error: 'Text too short (min 20 chars)' }, { status: 400 });
    }
    if (text.length > MAX_TEXT) {
        return json({ error: `Text too long (max ${MAX_TEXT} chars)` }, { status: 400 });
    }
    if (!sceneConfig || typeof sceneConfig !== 'object') {
        return json({ error: 'sceneConfig is required' }, { status: 400 });
    }

    // Generate a collision-resistant slug: realm-<username>-<8hex>
    const safeName = (user.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const hex = crypto.randomUUID().slice(0, 8);
    const slug = `realm-${safeName}-${hex}`;

    // Auto-generate a title from the first few words of the source text
    const titleBase = text.replace(/\s+/g, ' ').trim().slice(0, 40);
    const title = titleBase.length < text.trim().length ? `${titleBase}…` : titleBase;

    // Extract the environment type + palette for quick reference
    const envType = sceneConfig.environment?.type || 'space';
    const palette = sceneConfig.palette || {};

    try {
        // Insert into portals (the realm registry)
        await db.prepare(`
            INSERT INTO portals
                (id, galaxy_id, owner_id, visibility, source_text,
                 name_es, name_en, name_fr,
                 icon, color_primary, color_bg, color_text,
                 status, discovered_at)
            VALUES (?, 'personal', ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    'active', datetime('now'))
        `).bind(
            slug,
            user.id,
            visibility,
            text,
            title, title, title,  // same title all locales (user can edit later)
            '✨',
            palette.primary || '#c9a87c',
            palette.background || '#05030a',
            palette.safe_text_color || '#d6c3b8'
        ).run();

        // Store the scene config in portal_scenes
        await db.prepare(`
            INSERT INTO portal_scenes (portal_id, scene_config, source_writings, variant, generated_at)
            VALUES (?, ?, ?, 'default', datetime('now'))
        `).bind(
            slug,
            JSON.stringify(sceneConfig),
            JSON.stringify(['user-text']),
        ).run();

        return json({
            slug,
            url: `/portals/enter/${slug}`,
            title,
            visibility
        });
    } catch (e) {
        console.error('[realms/save] DB error:', e.message);
        return json({ error: 'Failed to save realm: ' + e.message }, { status: 500 });
    }
}
