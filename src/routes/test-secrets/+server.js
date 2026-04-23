// src/routes/api/test-secrets/+server.js
export async function GET({ platform }) {
  const accountId = platform?.env?.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN;
  
  return new Response(JSON.stringify({
    accountId: accountId ? 'present' : 'missing',
    apiToken: apiToken ? 'present' : 'missing',
    accountIdLength: accountId?.length || 0,
    apiTokenLength: apiToken?.length || 0,
    accountIdValue: accountId ? accountId.substring(0, 8) + '...' : '',
    // Note: Don't log the full token for security
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
