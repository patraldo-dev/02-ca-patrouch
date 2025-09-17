// src/lib/server/mailgun.js
export async function sendVerificationEmail(to, verifyUrl, env) {
    const apiKey = env.MAILGUN_API_KEY;
    const domain = env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
        throw new Error('Mailgun API key or domain not configured');
    }

    const formData = new FormData();
    formData.append('from', `noreply@${domain}`);
    formData.append('to', to);
    formData.append('subject', 'Verify your email for ShelfTalk');
    formData.append('text', `Click the link to verify your email: ${verifyUrl}`);
    formData.append('html', `
        <h2>Welcome to ShelfTalk!</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy and paste this link: <br><code>${verifyUrl}</code></p>
    `);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${btoa(`api:${apiKey}`)}`
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailgun error: ${response.status} ${errorText}`);
    }
}
