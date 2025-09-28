// src/routes/api/upload-image/+server.js
export async function POST({ request }) {
  console.log('=== UPLOAD REQUEST START ===');
  
  try {
    // Check environment variables
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    
    console.log('Environment variables:', {
      accountId: accountId ? 'present' : 'missing',
      apiToken: apiToken ? 'present' : 'missing'
    });
    
    if (!accountId || !apiToken) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing Cloudflare credentials'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    console.log('File details:', {
      file: file ? 'present' : 'missing',
      name: file?.name || 'n/a',
      size: file?.size || 0,
      type: file?.type || 'n/a'
    });
    
    if (!file) {
      console.error('No file provided');
      return new Response(JSON.stringify({ 
        error: 'No file provided',
        details: 'Request must include a file with key "file"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create FormData for Cloudflare
    const cloudflareFormData = new FormData();
    cloudflareFormData.append('file', file);
    
    // Make the request
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
    console.log('Cloudflare response:', {
      status: response.status,
      result
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: result.errors?.[0]?.message || 'Upload failed',
        details: result
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Upload successful');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
