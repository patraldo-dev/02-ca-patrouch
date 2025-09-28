// src/routes/api/upload-image/+server.js
export async function POST({ request, platform }) {
  console.log('=== UPLOAD REQUEST START ===');
  
  try {
    // 1. Check environment variables
    const accountId = platform?.env?.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN;
    
    console.log('Environment variables:', {
      accountId: accountId ? 'present' : 'missing',
      apiToken: apiToken ? 'present' : 'missing',
      accountIdLength: accountId?.length || 0,
      apiTokenLength: apiToken?.length || 0
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
    
    // 2. Parse form data
    console.log('Parsing form data...');
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
    
    // 3. Check file size (Cloudflare limit is 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return new Response(JSON.stringify({ 
        error: 'File too large',
        details: `Maximum file size is ${maxSize / (1024 * 1024)}MB`
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 4. Create FormData for Cloudflare
    console.log('Creating FormData for Cloudflare...');
    const cloudflareFormData = new FormData();
    cloudflareFormData.append('file', file);
    
    // 5. Make the request to Cloudflare
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
    console.log('Making request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: cloudflareFormData
    });
    
    console.log('Cloudflare response status:', response.status);
    
    const result = await response.json();
    console.log('Cloudflare response body:', result);
    
    // 6. Handle the response
    if (!response.ok) {
      console.error('Cloudflare API error:', result);
      return new Response(JSON.stringify({ 
        error: result.errors?.[0]?.message || 'Upload failed',
        details: result,
        status: response.status
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Upload successful!');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
