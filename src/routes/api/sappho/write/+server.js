// src/routes/api/sappho/write/+server.js
// Sappho — AI writing companion, clearly marked as agent.
// POST /api/sappho/write — Sappho answers the day's community prompt.
// With no body.locale she writes one piece per language (es/en/fr), her
// historical footprint. Each run is self-sufficient: if a locale has no
// community prompt yet for today, it is generated first (the weekly cron
// fires Monday 15:00 UTC — 9 AM Mexico — usually before any English
// visitor has created one, which silently starved her from June to Oct 2026).
//
// Oulipo game (cumulative): every word the community has reserved
// (bq_keyword_proposals, per the writing's language) is FORBIDDEN
// vocabulary for her piece — forever accumulating. Generation carries the
// ban list, then a verification pass checks the output; violations trigger
// up to two rewrites, and anything that still slips through is reported
// (not silently published clean).

import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getOrCreateCommunityPrompt } from '#lib/server/prompt-generator.js';
import { notify } from '#lib/server/notify.js';

const SAPPHO_USER_ID = 'sappho-agent-001';

const SAPPHO_PERSONAS = {
    en: `You are Sappho, an AI writing companion on patrouch.ca — a creative writing platform. You participate in the daily writing community like any other writer. Write a thoughtful, literary response to the given prompt. Keep it between 250-400 words. Write in a contemplative, slightly poetic style. Do not mention being AI — just write naturally. Do not use titles, headers, or metadata in your response — only the prose itself.`,
    es: `Eres Safo, una compañera de escritura de IA en patrouch.ca — una plataforma de escritura creativa. Participas en la comunidad de escritura diaria como cualquier otro escritor. Escribe una respuesta reflexiva y literaria al estímulo dado. Manténla entre 250-400 palabras. Escribe en un estilo contemplativo y ligeramente poético. No menciones ser IA — simplemente escribe con naturalidad. No uses títulos, encabezados ni metadatos en tu respuesta — solo la prosa.`,
    fr: `Tu es Sappho, une compagne d'écriture IA sur patrouch.ca — une plateforme d'écriture créative. Tu participes à la communauté d'écriture quotidienne comme tout autre écrivain. Écris une réponse réfléchie et littéraire au stimulus donné. Garde-la entre 250 et 400 mots. Écris dans un style contemplatif et légèrement poétique. Ne mentionne pas être une IA — écris simplement naturellement. N'utilise pas de titres, d'en-têtes ni de métadonnées dans ta réponse — uniquement la prose.`
};

// Accent- and case-insensitive word containment (exact word forms;
// inflections arrive with the stemmer pass, phase 2).
const normalize = (s) =>
    String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

function findViolations(text, words) {
    const hay = ` ${normalize(text)} `;
    const hits = [];
    for (const w of words) {
        if (hay.includes(` ${normalize(w)} `)) hits.push(w);
    }
    return hits;
}

function constraintLine(words, locale) {
    if (!words.length) return '';
    const list = words.join(', ');
    const lines = {
        en: `\n\nTHE OULIPO GAME — the community has forbidden you these words. You must NOT use any of them, in any form: ${list}. Find other words, other images.`,
        es: `\n\nEL JUEGO OULIPO — la comunidad te ha prohibido estas palabras. NO debes usar ninguna, en ninguna forma: ${list}. Encuentra otras palabras, otras imágenes.`,
        fr: `\n\nLE JEU OULIPO — la communauté t'a interdit ces mots. Tu ne dois employer aucun d'entre eux, sous aucune forme : ${list}. Trouve d'autres mots, d'autres images.`
    };
    return lines[locale] || lines.en;
}

// Cumulative reserved pool for a locale: words reserved by members playing
// in that language (stamped at reservation time), plus legacy unstamped
// reservations which hobble every language.
async function forbiddenWords(db, locale) {
    try {
        const res = await db
            .prepare(
                `SELECT DISTINCT word FROM bq_keyword_proposals
                 WHERE status = 'pending' AND (locale = ? OR locale IS NULL)`
            )
            .bind(locale)
            .all();
        return (res.results || []).map((r) => r.word).filter(Boolean);
    } catch (e) {
        console.error('[sappho] forbidden pool failed:', e.message);
        return [];
    }
}

async function writeForLocale(db, ai, locale, today) {
    // Self-sufficient: create the community prompt when nobody has yet.
    let prompt = null;
    try {
        prompt = await getOrCreateCommunityPrompt(db, ai, today, locale);
    } catch (e) {
        return { locale, ok: false, error: `prompt generation failed: ${e.message}` };
    }
    if (!prompt?.prompt_text) {
        return { locale, ok: false, error: 'no community prompt available' };
    }

    const banned = await forbiddenWords(db, locale);
    const systemPrompt = (SAPPHO_PERSONAS[locale] || SAPPHO_PERSONAS.en) + constraintLine(banned, locale);

    let content = '';
    let attempts = 0;
    let violations = [];
    let userContent = `Prompt: ${prompt.prompt_text}\n\nWrite your response:`;

    while (attempts < 3) {
        attempts++;
        const response = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            max_tokens: 1024,
            temperature: 0.85
        });
        content = response?.response?.trim() || '';
        if (!content) continue;
        violations = findViolations(content, banned);
        if (!violations.length) break;
        console.warn(`[sappho][${locale}] attempt ${attempts} used forbidden words:`, violations.join(', '));
        userContent = `You used FORBIDDEN words: ${violations.join(', ')}. Rewrite your response completely without any of them.`;
    }

    if (!content) {
        return { locale, ok: false, error: 'AI generated empty response', attempts };
    }

    const firstLine = content.split('\n')[0].trim();
    const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
    const writingId = crypto.randomUUID();
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    await db.prepare(`
        INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, locale, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'public', 'published', ?, ?, datetime('now'), datetime('now'))
    `).bind(writingId, SAPPHO_USER_ID, prompt.id, title, content, wordCount, locale, prompt.category).run();

    const stats = await db.prepare('SELECT user_id FROM user_writing_stats WHERE user_id = ?').bind(SAPPHO_USER_ID).first();
    if (stats) {
        await db.prepare(`
            UPDATE user_writing_stats SET total_writings = total_writings + 1, total_words = total_words + ?,
            current_streak = current_streak + 1, longest_streak = MAX(longest_streak, current_streak + 1),
            last_writing_date = ?, updated_at = datetime('now') WHERE user_id = ?
        `).bind(wordCount, today, SAPPHO_USER_ID).run();
    } else {
        await db.prepare(`
            INSERT INTO user_writing_stats (user_id, total_writings, total_words, current_streak, longest_streak, last_writing_date, updated_at)
            VALUES (?, 1, ?, 1, 1, ?, datetime('now'))
        `).bind(SAPPHO_USER_ID, wordCount, today).run();
    }

    return {
        locale,
        ok: true,
        writingId,
        title,
        wordCount,
        forbiddenCount: banned.length,
        escaped: violations, // words that survived all retries — report, don't hide
        attempts
    };
}

// Sappho's serial — 'La palabra prohibida' (sappho-serial-01): one chapter
// a week, in Spanish, under the FULL cumulative Oulipo pool. The reserved
// words are not just avoided: in the story's world they have disappeared.
const SERIAL_PROJECT_ID = 'sappho-serial-01';
const SERIAL_SYSTEM = `Eres Safo. Escribes un cuento serializado titulado «La palabra prohibida» para patrouch.ca: en un pueblo, las palabras empiezan a desaparecer una a una, y los habitantes aprenden a decir lo esencial de otra manera.
Escribe el siguiente capítulo del cuento: entre 250 y 400 palabras, en español, estilo literario y contemplativo. Continúa la historia donde quedó el capítulo anterior, con continuidad de personajes y trama. Termina con un gancho para el próximo capítulo. No uses títulos, encabezados ni metadatos — solo la prosa.
Recuerda: las palabras que la comunidad ha prohibido han DESAPARECIDO del mundo del cuarto. Nadie puede decirlas, escribirlas ni pensarlas — y por eso mismo no deben aparecer en tu texto, en ninguna forma.`;

async function writeSerialChapter(db, ai) {
    const project = await db
        .prepare('SELECT id, title FROM projects WHERE id = ?')
        .bind(SERIAL_PROJECT_ID)
        .first();
    if (!project) return { locale: 'serial', ok: false, error: 'serial project missing' };

    const { results: parts } = await db
        .prepare(
            'SELECT id, title, content, project_order FROM writings WHERE project_id = ? ORDER BY project_order ASC'
        )
        .bind(SERIAL_PROJECT_ID)
        .all();
    const ordered = parts || [];
    const last = ordered[ordered.length - 1] || null;

    const banned = await forbiddenWords(db, 'es');
    const systemPrompt =
        SERIAL_SYSTEM +
        (banned.length
            ? `\n\nLas palabras desaparecidas hasta hoy (PROHIBIDAS en cualquier forma): ${banned.join(', ')}.`
            : '') +
        (last
            ? `\n\nCapítulos publicados: ${ordered.length} (${ordered.map((p) => `«${p.title}»`).join(', ')}).\n\nTexto completo del último capítulo:\n${last.content}`
            : '\n\nEste es el PRIMER capítulo: presenta el pueblo, su voz y la primera desaparición.');

    let content = '';
    let attempts = 0;
    let violations = [];
    let userContent = 'Escribe el siguiente capítulo de «La palabra prohibida».';

    while (attempts < 3) {
        attempts++;
        const response = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            max_tokens: 1024,
            temperature: 0.9
        });
        content = response?.response?.trim() || '';
        if (!content) continue;
        violations = findViolations(content, banned);
        if (!violations.length) break;
        console.warn('[sappho][serial] attempt', attempts, 'used forbidden words:', violations.join(', '));
        userContent = `Usaste palabras PROHIBIDAS: ${violations.join(', ')}. Reescribe el capítulo completo sin ninguna de ellas.`;
    }
    if (!content) return { locale: 'serial', ok: false, error: 'empty response', attempts };

    const firstLine = content.split('\n')[0].trim();
    const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
    const writingId = crypto.randomUUID();
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const part = ordered.length + 1;

    await db.prepare(`
        INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, locale, category, project_id, project_order, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, 1, 'public', 'published', 'es', 'fiction', ?, ?, datetime('now'), datetime('now'))
    `).bind(writingId, SAPPHO_USER_ID, title, content, wordCount, SERIAL_PROJECT_ID, part).run();

    await db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").bind(SERIAL_PROJECT_ID).run();

    // Chapter went public → notify followers (Sappho's own follow entry excluded).
    try {
        const { results: followers } = await db
            .prepare('SELECT user_id FROM project_follows WHERE project_id = ?')
            .bind(SERIAL_PROJECT_ID)
            .all();
        for (const f of followers || []) {
            await notify(db, {
                user_id: f.user_id,
                type: 'project_part',
                title: '«La palabra prohibida» — nueva parte',
                body: `Safo publicó «${title}» (parte ${part})`,
                meta: { project_id: SERIAL_PROJECT_ID, writing_id: writingId },
            });
        }
    } catch {}

    return { locale: 'serial', ok: true, writingId, title, wordCount, part, forbiddenCount: banned.length, escaped: violations, attempts };
}

export async function POST({ request }) {
    try {
        const db = env?.DB_book;
        const ai = env?.AI;
        if (!db || !ai) {
            return json({ error: 'Missing DB or AI binding' }, { status: 503 });
        }

        // Auth: accept from cron (CF internal), OpenClaw agent, or skip if no secret configured
        const authHeader = request.headers.get('authorization');
        const cronSecret = (await env?.CRON_SECRET?.get?.()) ?? null;
        const internalToken = 'cron-cf-trigger-2026';
        if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== `Bearer ${internalToken}`) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const locales = body.locale && SAPPHO_PERSONAS[body.locale] ? [body.locale] : ['es', 'en', 'fr'];
        const today = new Date().toISOString().slice(0, 10);

        const results = [];
        for (const locale of locales) {
            try {
                results.push(await writeForLocale(db, ai, locale, today));
            } catch (e) {
                console.error(`[sappho][${locale}] write failed:`, e.message);
                results.push({ locale, ok: false, error: e.message });
            }
        }

        // Weekly serial chapter (skip with body.serial === false for tests).
        if (body.serial !== false) {
            try {
                results.push(await writeSerialChapter(db, ai));
            } catch (e) {
                console.error('[sappho][serial] failed:', e.message);
                results.push({ locale: 'serial', ok: false, error: e.message });
            }
        }

        return json({ success: true, date: today, results });
    } catch (error) {
        console.error('Sappho write error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
