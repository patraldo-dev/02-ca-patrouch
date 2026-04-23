// src/routes/api/auth/[...all]/+server.js
// Catch-all for Better Auth API routes
import { createAuth } from '$lib/auth.js';

export async function GET({ request, platform }) {
  const auth = createAuth(platform.env);
  return auth.handler(request);
}

export async function POST({ request, platform }) {
  const auth = createAuth(platform.env);
  return auth.handler(request);
}

export async function PUT({ request, platform }) {
  const auth = createAuth(platform.env);
  return auth.handler(request);
}

export async function DELETE({ request, platform }) {
  const auth = createAuth(platform.env);
  return auth.handler(request);
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
