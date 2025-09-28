// src/routes/api/test-secrets/+server.js
export async function GET({ platform }) {
  const accountId = platform?.env?.CLOUDFLARE_ACCOUNT_ID;
  
  return new Response(JSON.stringify({  
    accountId: accountId ? 'present' : 'missing',
    accountIdLength: accountId?.length || 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
