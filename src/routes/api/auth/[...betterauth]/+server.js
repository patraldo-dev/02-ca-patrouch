// src/routes/api/auth/[...betterauth]/+server.js
// Catch-all handler for Better Auth API routes
// All /api/auth/* requests are forwarded to Better Auth's handler
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
