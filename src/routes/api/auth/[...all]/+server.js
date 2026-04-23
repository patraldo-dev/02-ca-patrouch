// src/routes/api/auth/[...all]/+server.js
import { createAuth } from '$lib/auth.js';

export async function GET({ request, platform }) {
  console.log('[AUTH GET] path:', new URL(request.url).pathname, 'env keys:', Object.keys(platform?.env || {}));
  try {
    const auth = createAuth(platform.env);
    const response = await auth.handler(request);
    console.log('[AUTH GET] response type:', response?.constructor?.name);
    if (response instanceof Response) return response;
    console.error('[AUTH GET] auth.handler did not return a Response:', typeof response, response);
    return new Response(JSON.stringify({ error: 'Invalid auth response', debug: typeof response }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('[AUTH GET ERROR]', e.message, e.stack?.substring(0, 500));
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request, platform }) {
  console.log('[AUTH POST] path:', new URL(request.url).pathname, 'env keys:', Object.keys(platform?.env || {}));
  try {
    const auth = createAuth(platform.env);
    const response = await auth.handler(request);
    console.log('[AUTH POST] response type:', response?.constructor?.name);
    if (response instanceof Response) return response;
    console.error('[AUTH POST] auth.handler did not return a Response:', typeof response, response);
    return new Response(JSON.stringify({ error: 'Invalid auth response', debug: typeof response }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('[AUTH POST ERROR]', e.message, e.stack?.substring(0, 500));
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
