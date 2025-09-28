// src/routes/api/test-account/+server.js
export async function GET({ platform }) {
  const accountId = platform?.env?.CLOUDFLARE_ACCOUNT_ID;
  
  return new Response(JSON.stringify({
    accountId: accountId || 'missing'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
