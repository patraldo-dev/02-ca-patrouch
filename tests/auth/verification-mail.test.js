// Sign-up and its verification mail: node --test tests/auth/
import test from 'node:test';
import assert from 'node:assert/strict';

import { setup, signUp } from './helpers.js';

const SENDER = 'Patrouch <noreply@oulipo.party>';
const MEMBER = {
    email: 'new.member@example.com',
    password: 'a-long-enough-password',
    name: 'New Member',
    username: 'new_member'
};
const cloudflare = (send) => ({ EMAIL_BACKEND: 'cloudflare', EMAIL_FROM: SENDER, EMAIL: { send } });

/** Run `run` with console.error captured, and return what it was told. */
const errorsLogged = async (run) => {
    const lines = [];
    const original = console.error;
    console.error = (...args) => void lines.push(args.map(String).join(' '));
    try {
        await run();
    } finally {
        console.error = original;
    }
    return lines;
};

test('a verification mail Cloudflare refuses never costs the member the account', async () => {
    const tried = [];
    const { auth, usernames } = await setup(
        cloudflare(async (message) => {
            tried.push(message);
            throw Object.assign(new Error('destination address is not a verified address'), {
                code: 'E_RECIPIENT_NOT_ALLOWED'
            });
        })
    );
    let signedUp;
    const logged = await errorsLogged(async () => {
        signedUp = await signUp(auth, MEMBER);
    });
    assert.equal(signedUp.status, 200);
    assert.deepEqual(usernames(), ['new_member']);
    assert.equal(tried.length, 1);
    assert.equal(tried[0].to, MEMBER.email);
    assert.deepEqual(tried[0].from, { name: 'Patrouch', email: 'noreply@oulipo.party' });
    assert.match(tried[0].html, /verify-email\?token=/);
    assert.ok(
        logged.some((line) => line.includes('E_RECIPIENT_NOT_ALLOWED') && line.includes('not a verified address')),
        'the refusal code and its message are logged'
    );
});

test('when Cloudflare accepts, the mail leaves with the sign-up and nothing is logged', async () => {
    const sent = [];
    const { auth, usernames } = await setup(cloudflare(async (message) => void sent.push(message)));
    let signedUp;
    const logged = await errorsLogged(async () => {
        signedUp = await signUp(auth, MEMBER);
    });
    assert.equal(signedUp.status, 200);
    assert.deepEqual(usernames(), ['new_member']);
    assert.equal(sent.length, 1);
    assert.deepEqual(logged, []);
});

test('a site with no mail service still signs members up and sends nothing', async () => {
    const { auth, usernames } = await setup();
    assert.equal((await signUp(auth, MEMBER)).status, 200);
    assert.deepEqual(usernames(), ['new_member']);
});
