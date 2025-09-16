// src/lib/server/cookies.js
export function setSessionCookie(headers, sessionId, expiresAt) {
    const cookie = [
        `session=${sessionId}`,
        'HttpOnly',
        'SameSite=Lax',
        `Expires=${expiresAt.toUTCString()}`,
        'Path=/'
    ];

    if (process.env.NODE_ENV === 'production') {
        cookie.push('Secure');
    }

    headers.set('Set-Cookie', cookie.join('; '));
}

export function deleteSessionCookie(headers) {
    const cookie = [
        'session=',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
        'Path=/'
    ];

    if (process.env.NODE_ENV === 'production') {
        cookie.push('Secure');
    }

    headers.set('Set-Cookie', cookie.join('; '));
}
