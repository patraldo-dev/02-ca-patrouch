// Builders shared by the three language configs. Each config keeps the same
// shape (the contract is in ../types.d.ts), so a fourth language is one
// more file and nothing else.

/** Split a space-separated word list. @param {string} text @returns {string[]} */
export const words = (text) => text.trim().split(/\s+/).filter(Boolean);

/** @param {string} text @returns {Set<string>} */
export const wordSet = (text) => new Set(words(text));

/**
 * Verb families for the optional 'families' policy. A '|' separates
 * families; the first form of each is the key every form of the family
 * folds onto. A form already claimed by an earlier family is left there.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function familyMap(text) {
    const map = new Map();
    for (const family of text.split('|')) {
        const [key, ...forms] = words(family);
        if (!map.has(key)) map.set(key, key);
        for (const form of forms) if (!map.has(form)) map.set(form, key);
    }
    return map;
}

/**
 * Explicit masculine/feminine pairs, one pair per line or separated by '|'.
 * Each feminine folds onto whatever key `keyOf` gives its masculine, so
 * both genders meet after the plural rule.
 * @param {string} text
 * @param {(form: string) => string} keyOf
 * @returns {Map<string, string>}
 */
export function pairMap(text, keyOf) {
    const map = new Map();
    for (const pair of text.split(/[|\n]/)) {
        const [masculine, ...feminines] = words(pair);
        const key = keyOf(masculine);
        for (const feminine of feminines) map.set(keyOf(feminine), key);
    }
    return map;
}
