// The limit on attempts: node --test tests/auth/
// The sign-in library counts attempts per address; with the count kept in
// the database it holds for the whole site, whichever instance answered.
import test from 'node:test';
import assert from 'node:assert/strict';

import { ORIGIN, setup, signUp } from './helpers.js';

const MEMBER = {
    email: 'new.member@example.com',
    password: 'a-long-enough-password',
    name: 'New Member',
    username: 'new_member'
};
const WRONG = 'not-the-password';

/** One request to an endpoint, from one address. */
const from = (auth, path, body, address) =>
    auth.handler(
        new Request(`${ORIGIN}${path}`, {
            method: 'POST',
            headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': address },
            body: JSON.stringify(body)
        })
    );

const tryPassword = (auth, password, address) =>
    from(auth, '/api/auth/sign-in/email', { email: MEMBER.email, password }, address);

test('wrong passwords are cut off: the fourth within ten seconds is not even looked at', async () => {
    const { auth } = await setup();
    assert.equal((await signUp(auth, MEMBER)).status, 200);
    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt++) {
        statuses.push((await tryPassword(auth, WRONG, '203.0.113.9')).status);
    }
    assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
    // What the sign-in page goes by: the status, which it reads as "too many, wait".
    const refused = await tryPassword(auth, WRONG, '203.0.113.9');
    assert.equal(refused.status, 429);
    assert.match(String((await refused.json()).message), /Too many requests/i);
});

test('the count is kept per address, so one guesser does not lock a neighbour out', async () => {
    const { auth } = await setup();
    assert.equal((await signUp(auth, MEMBER)).status, 200);
    for (let attempt = 0; attempt < 4; attempt++) await tryPassword(auth, WRONG, '203.0.113.9');
    const elsewhere = await tryPassword(auth, MEMBER.password, '203.0.113.10');
    assert.equal(elsewhere.status, 200, 'the right password, from another address, signs in');
});

test('a member is not held up before the limit: three tries are theirs', async () => {
    const { auth } = await setup();
    assert.equal((await signUp(auth, MEMBER)).status, 200);
    await tryPassword(auth, WRONG, '203.0.113.11');
    await tryPassword(auth, WRONG, '203.0.113.11');
    const third = await tryPassword(auth, MEMBER.password, '203.0.113.11');
    assert.equal(third.status, 200, 'the third attempt in the window still goes through');
});
