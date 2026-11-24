// Sign-in tests: node --test tests/auth/
// Member creation runs against the site's own auth module on in-memory
// SQLite, with the unique username column production has.
import test from 'node:test';
import assert from 'node:assert/strict';

import { arrives, setup } from './helpers.js';

// Letters, digits and underscores, 3 to 30 characters: the username plugin's rules.
const RULES = /^[a-z0-9_]{3,30}$/;

test('two members arriving with the same display name both get an account', async () => {
    const { internalAdapter, usernames } = await setup();
    const first = await arrives(internalAdapter, { name: 'Chef Tech', email: 'first@example.com' });
    const second = await arrives(internalAdapter, { name: 'Chef Tech', email: 'second@example.com' });
    assert.ok(first.user.id && second.user.id);
    assert.notEqual(first.user.id, second.user.id);
    assert.deepEqual(usernames(), ['first', 'second']);
});

test('the username is built from the address, and a taken one gets a suffix', async () => {
    const { internalAdapter, usernames } = await setup();
    await arrives(internalAdapter, { name: 'Dana Roe', email: 'dana.roe@example.com' });
    await arrives(internalAdapter, { name: 'Someone Else', email: 'dana.roe@other.example' });
    const [taken, suffixed] = usernames();
    assert.equal(taken, 'dana_roe');
    assert.match(suffixed, /^dana_roe_[a-z0-9]{3}$/);
});

test('a short address still yields a valid username', async () => {
    const { internalAdapter, usernames } = await setup();
    await arrives(internalAdapter, { name: 'Jo', email: 'jo@example.com' });
    assert.match(usernames()[0], RULES);
});

test('a GitHub arrival obeys the same rules as a Google one', async () => {
    const { internalAdapter, usernames } = await setup();
    await arrives(internalAdapter, { name: 'Dana Roe', email: 'first@example.com' });
    await arrives(internalAdapter, { name: 'Dana Roe', email: 'second@example.com' }, 'github');
    assert.equal(usernames().length, 2);
    for (const username of usernames()) assert.match(username, RULES);
});

test('a username the member chose is left alone', async () => {
    const { internalAdapter, usernameOf } = await setup();
    const user = await internalAdapter.createUser({
        email: 'chosen@example.com',
        name: null,
        emailVerified: false,
        username: 'chosen_one'
    });
    assert.equal(await usernameOf(user.id), 'chosen_one');
});

test('a failed lookup never blocks the sign-in', async () => {
    const { internalAdapter, usernames, d1 } = await setup();
    const prepare = d1.prepare;
    d1.prepare = (query) => {
        if (query.includes('FROM users WHERE "username"')) throw new Error('database unavailable');
        return prepare(query);
    };
    await arrives(internalAdapter, { name: 'Dana Roe', email: 'dana.roe@example.com' });
    assert.match(usernames()[0], /^dana_roe_[a-z0-9]{6}$/);
});
