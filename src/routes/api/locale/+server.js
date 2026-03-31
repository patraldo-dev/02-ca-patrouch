import { json } from '@sveltejs/kit';

export async function POST({ request, cookies, url }) {
  const { locale } = await request.json();
  
  if (!['en', 'es', 'fr'].includes(locale)) {
    return json({ error: 'Invalid locale' }, { status: 400 });
  }

  cookies.set('preferredLanguage', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax'
  });

  // Return the referrer so the client knows where to go
  const referer = request.headers.get('referer') || '/';
  return json({ success: true, redirect: referer });
}
