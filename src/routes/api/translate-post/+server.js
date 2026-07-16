/**
 * POST /api/translate-post
 *
 * Publish-time translation helper for the Pinche Poutine Digital blog.
 * This worker (02-ca-patrouch) has the Workers AI binding; the blog
 * worker (03-digital-pp) does not. So translation is done here, at
 * publish time, by feeding a post JSON through Mistral and returning
 * the translated JSON to commit into the blog repo.
 *
 * NOT a public user-facing endpoint. Used by the publishing workflow
 * (ZCode calling this with a post JSON, getting back translated JSON,
 * committing it to 03-digital-pp). No auth gate because the input is
 * blog content and the output is a translation — nothing sensitive.
 *
 * AI: platform.env.AI (@cf/mistralai/mistral-small-3.1-24b-instruct)
 *
 * Body: { "post": { ...blog post JSON... }, "targetLang": "es|fr" }
 * Response: { "translated": { ...same shape, content translated... } }
 */
import { json } from '@sveltejs/kit';

const MISTRAL_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const VALID_TARGETS = ['es', 'fr'];

const LANG_NAMES = { en: 'English', es: 'Spanish', fr: 'French' };

export async function POST({ request, platform }) {
    const ai = platform?.env?.AI;
    if (!ai) return json({ error: 'AI not available' }, { status: 503 });

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const post = body.post;
    const targetLang = body.targetLang;

    if (!post || !post.sections || !Array.isArray(post.sections)) {
        return json({ error: 'post.sections array is required' }, { status: 400 });
    }
    if (!VALID_TARGETS.includes(targetLang)) {
        return json({ error: `targetLang must be one of: ${VALID_TARGETS.join(', ')}` }, { status: 400 });
    }

    const sourceLang = post.original_lang || 'en';
    const targetName = LANG_NAMES[targetLang];
    const sourceName = LANG_NAMES[sourceLang];

    // ── Translate all sections in one pass ──
    // Send sections as a numbered list so Mistral translates the whole
    // post in context (preserving cross-references and tone) in one call.
    const sectionsBlock = post.sections
        .map((s, i) => {
            const titlePart = s.title ? `TITLE: ${s.title}` : 'TITLE: (no title)';
            return `### SECTION_${i}\n${titlePart}\nCONTENT:\n${s.content || ''}`;
        })
        .join('\n\n');

    const sectionPrompt = `You are a literary translator. Translate the following blog post sections from ${sourceName} to ${targetName}.

Rules:
- Preserve ALL markdown formatting (bold, italics, code blocks, links, tables, lists).
- Do NOT translate code, URLs, slugs, JSON keys, or technical identifiers (like BoxGeometry, THREE.js, Cloudflare Workers).
- Keep the speaker labels ("Patrouch:" / "ZCode:") UNCHANGED — they are proper names of conversation participants.
- Translate natural prose naturally. Keep the conversational, reflective tone.
- Preserve the "entre chien et loup" French phrase if it appears — it's a quoted idiom.
- For each section, output TITLE and CONTENT on separate lines, matching the input format exactly.

Input:

${sectionsBlock}

Output the translated sections in this exact format (no preamble, no markdown fences):

### SECTION_0
TITLE: <translated title or original>
CONTENT:
<translated content>

### SECTION_1
...`;

    let sectionText;
    try {
        const response = await ai.run(MISTRAL_MODEL, {
            messages: [{ role: 'user', content: sectionPrompt }],
            temperature: 0.3,
            max_tokens: 4000,
        });
        sectionText = response.response || response.result?.response || '';
    } catch (e) {
        console.error('[translate-post] Mistral sections call failed:', e.message);
        return json({ error: 'Translation failed: ' + e.message }, { status: 502 });
    }

    const translatedSections = parseTranslatedSections(sectionText, post.sections);

    if (!translatedSections) {
        console.error('[translate-post] Section count mismatch. Expected',
            post.sections.length, 'got', translatedSections?.length);
        return json({
            error: 'Translation parse failed — section count mismatch',
            raw: sectionText.slice(0, 500)
        }, { status: 500 });
    }

    // ── Translate title + excerpt in a second small call ──
    const [translatedTitle, translatedExcerpt] = await Promise.all([
        post.title ? translateShort(ai, post.title, sourceName, targetName) : null,
        post.excerpt ? translateShort(ai, post.excerpt, sourceName, targetName) : null
    ]);

    const translated = {
        ...post,
        original_lang: sourceLang,
        translated: true,
        translated_from: sourceLang,
        translated_to: targetLang,
        title: translatedTitle || post.title,
        excerpt: translatedExcerpt || post.excerpt,
        sections: translatedSections
    };

    return json({ translated });
}

/**
 * Parse Mistral's section-delimited output back into an array.
 * Returns null on count mismatch.
 */
function parseTranslatedSections(text, originalSections) {
    const sections = [];
    const parts = text.split(/###\s*SECTION_\d+/i).filter((s) => s.trim());

    for (const part of parts) {
        const titleMatch = part.match(/^[\s\n]*TITLE:\s*(.+?)$/m);
        const contentMatch = part.match(/CONTENT:\s*\n([\s\S]*?)$/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        let content = contentMatch ? contentMatch[1].trim() : '';

        content = content.replace(/###\s*SECTION_\d+[\s\S]*$/i, '').trim();

        const orig = originalSections[sections.length];
        sections.push({
            title: title === '(no title)' ? '' : title,
            content,
            ...(orig?.lang ? { lang: orig.lang } : {})
        });
    }

    return sections.length === originalSections.length ? sections : null;
}

/**
 * Translate a short string (title/excerpt). Falls back to null on failure.
 */
async function translateShort(ai, text, sourceName, targetName) {
    try {
        const response = await ai.run(MISTRAL_MODEL, {
            messages: [{
                role: 'user',
                content: `Translate this single line from ${sourceName} to ${targetName}. Output ONLY the translation, nothing else:\n\n${text}`
            }],
            temperature: 0.3,
            max_tokens: 300,
        });
        const result = (response.response || '').trim();
        return result || null;
    } catch {
        return null;
    }
}
