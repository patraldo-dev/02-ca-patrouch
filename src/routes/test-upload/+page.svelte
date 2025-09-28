<script>
  async function uploadFile(event) {
    event.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Sending file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      console.log('Upload response:', {
        status: response.status,
        result
      });
      
      if (response.ok) {
        alert('Upload successful!');
        console.log('Upload result:', result);
      } else {
        alert(`Upload failed: ${result.error}`);
        console.error('Upload error:', result);
      }
    } catch (error) {
      alert(`Upload error: ${error.message}`);
      console.error('Upload error:', error);
    }
  }
</script>

<h1>Test Image Upload</h1>
<form on:submit|preventDefault={uploadFile}>
  <input type="file" id="fileInput" accept="image/*" required />
  <button type="submit">Upload</button>
</form>
