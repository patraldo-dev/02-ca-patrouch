// Email sending tests: node --test tests/email/
// Both services are exercised: Mailgun through a stand-in for fetch, and
// Cloudflare through a stand-in for the Worker's EMAIL binding.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    EmailError,
    emailBackend,
    emailConfigured,
    sendEmail,
    verificationMessage
} from '../../src/lib/server/email-sender.js';

const MESSAGE = Object.freeze({
    to: 'member@example.com',
    subject: 'Welcome',
    html: '<p>Welcome</p>',
    text: 'Welcome'
});
const CLOUDFLARE = (send) => ({
    EMAIL_BACKEND: 'cloudflare',
    EMAIL_FROM: 'Patrouch <noreply@oulipo.party>',
    EMAIL: { send }
});
const REFUSED = () =>
    Object.assign(new Error('destination address is not a verified address'), {
        code: 'E_RECIPIENT_NOT_ALLOWED'
    });

/** Run `run` with fetch answering as Mailgun would, and return what it was asked. */
const atMailgun = async (run, status = 200) => {
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), ...init });
        return new Response(JSON.stringify({ id: '<one-mail>' }), { status });
    };
    try {
        await run();
    } finally {
        globalThis.fetch = original;
    }
    return calls;
};

test('Mailgun is the default, and it is asked exactly as before', async () => {
    const env = {
        MAILGUN_API_KEY: 'key-1',
        MAILGUN_DOMAIN: 'mail.patrouch.ca',
        MAILGUN_FROM_EMAIL: 'noreply@patrouch.ca'
    };
    assert.equal(emailBackend(env), 'mailgun');
    assert.equal(emailConfigured(env), true);
    const calls = await atMailgun(async () => {
        assert.equal(await sendEmail(env, MESSAGE), 'mailgun');
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.mailgun.net/v3/mail.patrouch.ca/messages');
    assert.equal(calls[0].headers.Authorization, `Basic ${btoa('api:key-1')}`);
    assert.equal(calls[0].body.get('from'), 'patrouch.ca <noreply@patrouch.ca>');
    assert.equal(calls[0].body.get('to'), MESSAGE.to);
    assert.equal(calls[0].body.get('subject'), MESSAGE.subject);
    assert.equal(calls[0].body.get('html'), MESSAGE.html);
    assert.equal(calls[0].body.get('text'), MESSAGE.text);
});

test('a site set to Cloudflare sends through the Worker binding, with no key and no Mailgun', async () => {
    const sent = [];
    const env = { ...CLOUDFLARE(async (message) => void sent.push(message)), MAILGUN_API_KEY: 'key-1', MAILGUN_DOMAIN: 'mail.patrouch.ca' };
    assert.equal(emailBackend(env), 'cloudflare');
    assert.equal(emailConfigured(env), true);
    const calls = await atMailgun(async () => {
        assert.equal(await sendEmail(env, { ...MESSAGE, replyTo: 'help@patrouch.ca' }), 'cloudflare');
    });
    assert.equal(calls.length, 0);
    assert.deepEqual(sent, [
        {
            to: MESSAGE.to,
            from: { name: 'Patrouch', email: 'noreply@oulipo.party' },
            subject: MESSAGE.subject,
            html: MESSAGE.html,
            text: MESSAGE.text,
            replyTo: 'help@patrouch.ca'
        }
    ]);
});

test('no reply-to field is added when none is given', async () => {
    const sent = [];
    await sendEmail(CLOUDFLARE(async (message) => void sent.push(message)), MESSAGE);
    assert.deepEqual(sent, [
        {
            to: MESSAGE.to,
            from: { name: 'Patrouch', email: 'noreply@oulipo.party' },
            subject: MESSAGE.subject,
            html: MESSAGE.html,
            text: MESSAGE.text
        }
    ]);
});

// The binding takes a bare address, or an object with both an email and a name;
// a "Name <address>" string is neither and is rejected as a bad address.
test('the sender reaches the binding in the two forms it accepts', async () => {
    const seen = [];
    const send = CLOUDFLARE(async ({ from }) => void seen.push(from)).EMAIL.send;
    const run = (EMAIL_FROM) => sendEmail({ EMAIL_BACKEND: 'cloudflare', EMAIL_FROM, EMAIL: { send } }, MESSAGE);
    await run('noreply@oulipo.party');
    await run('Patrouch (staging)  <staging@oulipo.party> ');
    await run('"Patrouch, Inc." <noreply@oulipo.party>');
    await run('<noreply@oulipo.party>');
    assert.deepEqual(seen, [
        'noreply@oulipo.party',
        { name: 'Patrouch (staging)', email: 'staging@oulipo.party' },
        { name: 'Patrouch, Inc.', email: 'noreply@oulipo.party' },
        { name: 'noreply@oulipo.party', email: 'noreply@oulipo.party' }
    ]);
});

test('a site with nothing configured sends nothing, and says why', async () => {
    assert.equal(emailConfigured({}), false);
    const calls = await atMailgun(() =>
        assert.rejects(
            sendEmail({}, MESSAGE),
            (error) => error instanceof EmailError && error.code === 'not_configured'
        )
    );
    assert.equal(calls.length, 0);
});

test('Cloudflare chosen, but the binding or the sender is missing', async () => {
    assert.equal(emailConfigured({ EMAIL_BACKEND: 'cloudflare' }), false);
    await assert.rejects(sendEmail({ EMAIL_BACKEND: 'cloudflare' }, MESSAGE), { code: 'no_binding' });
    await assert.rejects(
        sendEmail({ EMAIL_BACKEND: 'cloudflare', EMAIL: { send: async () => {} } }, MESSAGE),
        { code: 'no_sender' }
    );
});

test('a refusal from Cloudflare is passed on with its code', async () => {
    await assert.rejects(sendEmail(CLOUDFLARE(async () => { throw REFUSED(); }), MESSAGE), {
        code: 'E_RECIPIENT_NOT_ALLOWED'
    });
});

test('a Mailgun failure is passed on too', async () => {
    const env = { MAILGUN_API_KEY: 'key-1', MAILGUN_DOMAIN: 'mail.patrouch.ca' };
    await atMailgun(() => assert.rejects(sendEmail(env, MESSAGE), /Mailgun 500/), 500);
});

test('the verification mail carries the link in both of its parts', () => {
    const link = 'https://patrouch.ca/api/auth/verify-email?token=abc&callbackURL=%2Fwrite';
    const message = verificationMessage(link);
    assert.equal(message.subject, 'Verify your email — Patrouch');
    assert.ok(message.html.includes(`href="${link}"`));
    assert.equal(message.text, `Verify your email: ${link}`);
});
