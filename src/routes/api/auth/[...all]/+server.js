// src/routes/api/auth/[...all]/+server.js
// Catch-all for Better Auth API routes
import { createAuth } from '$lib/auth.js';

export async function GET({ request, platform }) {
  try {
    const auth = createAuth(platform.env);
    const response = await auth.handler(request);
    return response;
  } catch (e) {
    console.error('[AUTH GET]', e.message, e.stack);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request, platform }) {
  try {
    const auth = createAuth(platform.env);
    const response = await auth.handler(request);
    return response;
  } catch (e) {
    console.error('[AUTH POST]', e.message, e.stack);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request, platform }) {
  try {
    const auth = createAuth(platform.env);
    return await auth.handler(request);
  } catch (e) {
    console.error('[AUTH PUT]', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request, platform }) {
  try {
    const auth = createAuth(platform.env);
    return await auth.handler(request);
  } catch (e) {
    console.error('[AUTH DELETE]', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
