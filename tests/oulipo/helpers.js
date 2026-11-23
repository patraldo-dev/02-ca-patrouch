// Test doubles for the duel's server flow: a D1-shaped wrapper around an
// in-memory SQLite database, and a Workers AI binding that answers from a
// script. Nothing here touches a Cloudflare account or a live database.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sql = (path) => readFileSync(join(root, path), 'utf8');

// Only what the duel reads from the rest of the schema.
const SCHEMA = `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT,
  show_profile INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  display_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  show_in_scoreboard INTEGER DEFAULT 1
);
CREATE TABLE writing_prompts (
  id TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  prompt_date TEXT NOT NULL,
  category TEXT NOT NULL,
  locale TEXT DEFAULT 'en'
);
`;

export class SqliteD1 {
    constructor() {
        this.db = new DatabaseSync(':memory:');
        this.db.exec(SCHEMA);
        // The real migration, exactly as it will be applied.
        this.db.exec(sql('migrations/025-oulipo-duel.sql'));
    }

    prepare(query) {
        const statement = this.db.prepare(query);
        return {
            bind: (...args) => ({
                first: async () => statement.get(...args) ?? null,
                all: async () => ({ success: true, results: statement.all(...args) }),
                run: async () => {
                    const result = statement.run(...args);
                    return {
                        success: true,
                        meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) }
                    };
                }
            })
        };
    }

    rows(query, ...args) {
        return this.db.prepare(query).all(...args);
    }
}

/**
 * A Workers AI binding whose answers come from `script`, one per call.
 * An Error in the script is thrown instead of answered.
 */
export function fakeAi(script = []) {
    const queue = [...script];
    const calls = [];
    return {
        calls,
        get pending() {
            return queue.length;
        },
        run: async (model, input) => {
            calls.push({ model, input });
            const next = queue.shift();
            if (next instanceof Error) throw next;
            return { response: next };
        }
    };
}

export const addUser = (db, id, { username = id, showProfile = 1 } = {}) =>
    db.prepare('INSERT INTO users (id, username, name, show_profile) VALUES (?, ?, NULL, ?)')
        .bind(id, username, showProfile)
        .run();

export const addProfile = (db, userId, { displayName = null, active = 1, scoreboard = 1 } = {}) =>
    db
        .prepare(
            'INSERT INTO profiles (id, user_id, display_name, is_active, show_in_scoreboard) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(`profile-${userId}-${Math.random()}`, userId, displayName, active, scoreboard)
        .run();

export const addPrompt = (db, day, locale, text) =>
    db
        .prepare(
            `INSERT INTO writing_prompts (id, prompt_text, prompt_date, category, locale)
             VALUES (?, ?, ?, 'daily-community', ?)`
        )
        .bind(`prompt-${locale}-${day}`, text, day, locale)
        .run();

/** A hidden draft written straight to the table, so a test need not generate one. */
export const addDraft = (db, day, locale, content, prompt = 'The prompt of the day') =>
    db
        .prepare(
            `INSERT INTO oulipo_duel_drafts (id, locale, duel_date, prompt_id, prompt_text, content, model)
             VALUES (?, ?, ?, NULL, ?, ?, 'test')`
        )
        .bind(`draft-${locale}-${day}`, locale, day, prompt, content)
        .run();

/** The same scene in the three languages, with the draft each is scored against. */
export const SCENES = {
    en: {
        story: `The lighthouse keeper counted the gulls again and arrived at the same number as yesterday. Below the cliff, the sea folded itself into the rocks with a patience that frightened her. She wrote the count in the ledger, beside her father's handwriting, and wondered whether he had also listened for the bell that no longer rang. When the fog came in, she lit the lamp and watched the beam sweep across water that gave nothing back.`,
        draft: `The lighthouse keeper watched the sea. The fog came in, and the lamp burned for no one. She listened to the water and heard her father's voice.`,
        /** Rope keys exactly as the engine gives them. */
        ropes: ['lighthouse', 'gull', 'lamp', 'father'],
        rewrite: `The keeper watched the water. Night came, and the little light burned for no one. She listened and heard a voice she knew.`
    },
    es: {
        story: `La guardiana del faro contó las gaviotas otra vez y llegó al mismo número que ayer. Debajo del acantilado, el mar se plegaba contra las rocas con una paciencia que la asustaba. Escribió la cuenta en el libro, junto a la letra de su padre, y se preguntó si él también había esperado la campana que ya no sonaba. Cuando llegó la niebla, encendió la lámpara y miró el haz cruzar un agua que no devolvía nada.`,
        draft: `La guardiana del faro miraba el mar. Llegó la niebla, y la lámpara ardía para nadie. Escuchó el agua y oyó la voz de su padre.`,
        ropes: ['guardiana', 'gaviota', 'lámpara', 'padre'],
        rewrite: `Miraba el agua desde la torre. Llegó la noche, y la pequeña luz ardía para nadie. Escuchó y oyó una voz conocida.`
    },
    fr: {
        story: `La gardienne du phare compta les goélands une fois de plus et trouva le même nombre que la veille. Sous la falaise, la mer se repliait contre les rochers avec une patience qui l'effrayait. Elle écrivit le compte dans le registre, à côté de l'écriture de son père, et se demanda s'il avait lui aussi attendu la cloche qui ne sonnait plus. Quand le brouillard arriva, elle alluma la lampe et regarda le faisceau traverser une eau qui ne rendait rien.`,
        draft: `La gardienne du phare regardait la mer. Le brouillard est arrivé, et la lampe brûlait pour personne. Elle a écouté l'eau et entendu la voix de son père.`,
        ropes: ['gardien', 'goéland', 'lampe', 'père'],
        rewrite: `Elle regardait l'eau depuis la tour. La nuit est venue, et la petite lumière brûlait pour personne. Elle a écouté et entendu une voix qu'elle connaissait.`
    }
};
