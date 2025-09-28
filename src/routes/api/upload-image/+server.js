export async function POST({ request }) {
  try {
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get credentials from environment variables
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    
    // Create a new FormData for the Cloudflare request
    const cloudflareFormData = new FormData();
    cloudflareFormData.append('file', file);
    
    // Make the request to Cloudflare Images API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`
        },
        body: cloudflareFormData
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Cloudflare API error:', result);
      return new Response(JSON.stringify({ 
        error: result.errors?.[0]?.message || 'Upload failed',
        details: result 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
