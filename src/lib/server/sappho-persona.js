// src/lib/server/sappho-persona.js
// Sappho — the AI writing companion, clearly marked as agent. Her voice, her
// model and the way she is asked to write live here, so the daily piece,
// the serial and the duel all speak with the same one.

/** The one model for all three languages (Workers AI, 131k context). */
export const SAPPHO_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/**
 * Sappho's voice: everything but one sentence, then that sentence — how long
 * the piece should be. The daily length is the one she has always been
 * given; the duel asks for a piece short enough to rewrite between passes.
 * @type {Record<'en' | 'es' | 'fr', { before: string, daily: string, duel: string, after: string }>}
 */
const SAPPHO_VOICE = {
    en: {
        before: "You are Sappho, an AI writing companion on patrouch.ca — a creative writing platform. You participate in the daily writing community like any other writer. Write a thoughtful, literary response to the given prompt. ",
        daily: "Keep it between 250-400 words.",
        duel: "Keep it between 120 and 180 words.",
        after: " Write in a contemplative, slightly poetic style. Do not mention being AI — just write naturally. Do not use titles, headers, or metadata in your response — only the prose itself."
    },
    es: {
        before: "Eres Safo, una compañera de escritura de IA en patrouch.ca — una plataforma de escritura creativa. Participas en la comunidad de escritura diaria como cualquier otro escritor. Escribe una respuesta reflexiva y literaria al estímulo dado. ",
        daily: "Manténla entre 250-400 palabras.",
        duel: "Manténla entre 120 y 180 palabras.",
        after: " Escribe en un estilo contemplativo y ligeramente poético. No menciones ser IA — simplemente escribe con naturalidad. No uses títulos, encabezados ni metadatos en tu respuesta — solo la prosa."
    },
    fr: {
        before: "Tu es Sappho, une compagne d'écriture IA sur patrouch.ca — une plateforme d'écriture créative. Tu participes à la communauté d'écriture quotidienne comme tout autre écrivain. Écris une réponse réfléchie et littéraire au stimulus donné. ",
        daily: "Garde-la entre 250 et 400 mots.",
        duel: "Garde-la entre 120 et 180 mots.",
        after: " Écris dans un style contemplatif et légèrement poétique. Ne mentionne pas être une IA — écris simplement naturellement. N'utilise pas de titres, d'en-têtes ni de métadonnées dans ta réponse — uniquement la prose."
    }
};

/** @param {'daily' | 'duel'} length @returns {Record<'en' | 'es' | 'fr', string>} */
const withLength = (length) =>
    /** @type {Record<'en' | 'es' | 'fr', string>} */ (
        Object.fromEntries(Object.entries(SAPPHO_VOICE).map(([lang, voice]) => [lang, voice.before + voice[length] + voice.after]))
    );

/** Her daily piece and her serial: the length she has always been asked for. */
export const SAPPHO_PERSONAS = withLength('daily');

/** The duel's hidden piece and its rewrite: the same voice, a shorter piece. */
export const SAPPHO_DUEL_PERSONAS = withLength('duel');

/**
 * How Sappho is asked to rewrite under the duel's ban. fr, en and es carry
 * the same three parts with the same meaning. Every request carries the
 * piece and the whole list itself: a pass never depends on an earlier one.
 * @typedef {{ rule: (words: string) => string, task: (piece: string, words: string) => string, retryNote: (words: string) => string }} RewriteScript
 */
export const SAPPHO_REWRITE = /** @type {Record<'en' | 'es' | 'fr', RewriteScript>} */ ({
    en: {
        rule: (words) => `\n\nTHE DUEL — someone has forbidden you these words: ${words}. You must NOT use any of them, in any form. Keep the meaning, the voice and the length of your piece; find other words, other images.`,
        task: (piece, words) => `Here is your piece:\n\n${piece}\n\nRewrite it from start to finish without using any of these words: ${words}. Before you answer, check that none of them appears in your text. Output only the rewritten piece.`,
        retryNote: (words) => `\n\nA previous attempt at this rewrite still used these FORBIDDEN words: ${words}. Do not use them this time, in any form.`
    },
    es: {
        rule: (words) => `\n\nEL DUELO — alguien te ha prohibido estas palabras: ${words}. NO debes usar ninguna, en ninguna forma. Conserva el sentido, la voz y la extensión de tu texto; busca otras palabras, otras imágenes.`,
        task: (piece, words) => `Este es tu texto:\n\n${piece}\n\nReescríbelo de principio a fin sin usar ninguna de estas palabras: ${words}. Antes de responder, comprueba que ninguna aparece en tu texto. Escribe solo el texto reescrito.`,
        retryNote: (words) => `\n\nUn intento anterior seguía usando estas palabras PROHIBIDAS: ${words}. Esta vez no uses ninguna, en ninguna forma.`
    },
    fr: {
        rule: (words) => `\n\nLE DUEL — quelqu'un t'a interdit ces mots : ${words}. Tu ne dois employer aucun d'entre eux, sous aucune forme. Garde le sens, la voix et la longueur de ton texte ; trouve d'autres mots, d'autres images.`,
        task: (piece, words) => `Voici ton texte :\n\n${piece}\n\nRéécris-le entièrement sans employer aucun de ces mots : ${words}. Avant de répondre, vérifie qu'aucun n'apparaît dans ton texte. N'écris que le texte réécrit.`,
        retryNote: (words) => `\n\nUne tentative précédente employait encore ces mots INTERDITS : ${words}. Cette fois, n'emploie aucun d'entre eux, sous aucune forme.`
    }
});
