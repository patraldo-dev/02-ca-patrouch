// In-memory stand-ins for the sign-in tests: node --test tests/auth/
import { DatabaseSync } from 'node:sqlite';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { createAuth } from '../../src/lib/auth.js';
import { authSchema } from '../../src/db/auth-schema.js';

const ORIGIN = 'http://localhost:3000';
const SECRET = 'a-secret-that-is-long-enough-for-the-sign-in-tests';

/**
 * The site's own auth module over an in-memory database that answers like
 * Cloudflare D1. The four tables come from the schema file the site maintains
 * by hand, with the unique constraint production has on users.username.
 */
export async function setup() {
    const sqlite = new DatabaseSync(':memory:');
    for (const table of Object.values(authSchema)) {
        const { name, columns } = getTableConfig(table);
        const definitions = columns.map(
            (column) =>
                `"${column.name}" ${column.getSQLType()}${column.primaryKey ? ' PRIMARY KEY' : ''}${column.notNull ? ' NOT NULL' : ''}`
        );
        sqlite.exec(`CREATE TABLE "${name}" (${definitions.join(', ')})`);
    }
    sqlite.exec('CREATE UNIQUE INDEX users_username_unique ON users ("username")');

    // The library asks for the rows of an insert-with-returning as plain arrays.
    const d1 = {
        prepare(query) {
            const statement = sqlite.prepare(query);
            return {
                bind: (...args) => ({
                    run: async () => {
                        const result = statement.run(...args);
                        return {
                            success: true,
                            meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) }
                        };
                    },
                    all: async () => ({ success: true, results: statement.all(...args), meta: {} }),
                    first: async () => statement.get(...args) ?? null,
                    raw: async () => statement.all(...args).map((row) => Object.values(row))
                })
            };
        },
        async batch(statements) {
            const out = [];
            for (const statement of statements) out.push(await statement.all());
            return out;
        }
    };

    const auth = createAuth({
        DB_book: d1,
        BETTER_AUTH_SECRET: SECRET,
        PATROUCH_BASE_URL: ORIGIN,
        GOOGLE_CLIENT_ID: 'google-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GITHUB_CLIENT_ID: 'github-id',
        GITHUB_CLIENT_SECRET: 'github-secret'
    });
    const { internalAdapter } = await auth.$context;

    const usernames = () =>
        sqlite.prepare('SELECT "username" FROM users ORDER BY rowid').all().map((row) => row.username);
    const usernameOf = async (id) =>
        (await d1.prepare('SELECT "username" FROM users WHERE "id" = ?').bind(id).first())?.username ?? null;

    return { internalAdapter, usernames, usernameOf, d1 };
}

/**
 * A first sign-in through a provider: the provider hands over a display name
 * and an address, never a username.
 */
export const arrives = (internalAdapter, { name, email }, provider = 'google') =>
    internalAdapter.createOAuthUser(
        { name, email: email.toLowerCase(), emailVerified: true },
        { providerId: provider, accountId: `account-of-${email}` }
    );
