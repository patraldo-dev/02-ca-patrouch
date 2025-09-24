<script>
    import { browser } from '$app/environment';

    let title = '';
    let author = '';
    let isbn = '';
    let coverImageFiles = [];
    let error = '';

    async function handleAddBook() {
        if (!coverImageFiles || coverImageFiles.length === 0) {
            error = 'Please select a cover image';
            return;
        }

        try {
            // 1. Upload image
            const formData = new FormData();
            formData.append('file', coverImageFiles[0]);

            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const uploadResult = await uploadResponse.json();

            if (!uploadResult.imageId) {
                throw new Error('Image upload failed');
            }

            // 2. Create book with imageId
            const bookData = {
                title,
                author,
                isbn,
                coverImageId: uploadResult.imageId
            };

            const response = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            if (response.ok) {
                alert('Book added successfully!');
                // Reset form
                title = '';
                author = '';
                isbn = '';
                coverImageFiles = [];
                error = '';
            } else {
                throw new Error('Failed to add book');
            }

        } catch (err) {
            console.error('Error:', err);
            error = err.message;
        }
    }
</script>

<form on:submit|preventDefault={handleAddBook}>
    <!-- ... your existing fields ... -->

    <!-- Image Upload -->
    <div class="input-group">
        <label for="coverImage">Book Cover</label>
        <input
            id="coverImage"
            type="file"
            accept="image/*"
            bind:files={coverImageFiles}
            required
        />
    </div>

    {#if error}
        <p style="color: red;">{error}</p>
    {/if}

    <button type="submit">Add Book</button>
</form>
