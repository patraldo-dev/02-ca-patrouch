<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    
    let book = null;
    let loading = true;
    let error = null;
    
    export let params;
    
    onMount(async () => {
        try {
            // Make sure params.slug is defined
            if (!params.slug || params.slug === 'undefined') {
                error = 'Invalid book slug';
                loading = false;
                return;
            }
            
            // Use the plural form /api/books/[slug]
            const response = await fetch(`/api/books/${params.slug}`);
            if (response.ok) {
                book = await response.json();
            } else {
                error = 'Failed to load book';
            }
        } catch (err) {
            console.error('Error fetching book:', err);
            error = 'Network error. Please try again.';
        } finally {
            loading = false;
        }
    });
</script>
