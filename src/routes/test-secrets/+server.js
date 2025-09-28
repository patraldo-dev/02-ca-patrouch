// src/routes/api/test-secrets/+server.js
export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  return new Response(JSON.stringify({
    accountId: accountId ? 'present' : 'missing',
    apiToken: apiToken ? 'present' : 'missing',
    accountIdLength: accountId?.length || 0,
    apiTokenLength: apiToken?.length || 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
