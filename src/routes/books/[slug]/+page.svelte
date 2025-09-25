<!-- src/routes/books/[slug]/+page.svelte -->
<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    
    /** @type {import('./$types').PageData} */
    export let data;
    
    // State for client-side fetching (if needed)
    let book = data?.book || null;
    let loading = !data?.book;
    let error = null;
    
    // Function to handle new comment
    function handleCommentPosted(reviewId, newComment) {
        const review = book.reviews.find(r => r.id === reviewId);
        if (review) {
            review.comments = [...(review.comments || []), newComment];
        }
    }
    
    // Client-side fetching if book data isn't available
    onMount(async () => {
        if (!data?.book) {
            try {
                // Get the slug from page parameters
                const slug = $page.params.slug;
                
                if (!slug) {
                    error = 'Book slug is missing';
                    loading = false;
                    return;
                }
                
                const response = await fetch(`/api/books/${slug}`);
                
                if (response.ok) {
                    book = await response.json();
                } else {
                    error = 'Book not found';
                }
            } catch (err) {
                console.error('Error fetching book:', err);
                error = 'Failed to load book details';
            } finally {
                loading = false;
            }
        }
    });
</script>

<div class="login-container" on:keydown={handleKeyDown}>
    <div class="login-card">
        <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h1 class="title">Welcome Back</h1>
        <p class="subtitle">Sign in to your account</p>
        
        {#if error}
            <div class="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                {error}
            </div>
        {/if}
        
        <form on:submit|preventDefault={handleLogin} class="login-form">
            <div class="input-group">
                <label for="identifier">Email or Username</label>
                <input
                    id="identifier"
                    bind:value={identifier}
                    type="text"
                    placeholder="Enter email or username"
                    required
                    autocomplete="username"
                    disabled={isLoading}
                />
            </div>
            <div class="input-group">
                <label for="password">Password</label>
                <input
                    id="password"
                    bind:value={password}
                    type="password"
                    placeholder="•••••••••••••••"
                    required
                    autocomplete="current-password"
                    disabled={isLoading}
                />
            </div>
            <button type="submit" class="login-btn" disabled={isLoading}>
                {#if isLoading}
                    <span class="spinner"></span> Signing in...
                {:else}
                    Sign In
                {/if}
            </button>
        </form>
        
        <p class="footer">
            Don't have an account? <a href="/signup">Sign up</a>
        </p>
    </div>
</div>

<style>
    .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        padding: 20px;
    }
    
    .login-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
        padding: 40px;
        text-align: center;
    }
    
    .logo {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
        color: #3b82f6;
    }
    
    .title {
        font-size: 28px;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 8px 0;
    }
    
    .subtitle {
        color: #6b7280;
        margin: 0 0 32px 0;
        font-size: 16px;
    }
    
    .error-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: #fef2f2;
        color: #b91c1c;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        font-size: 14px;
    }
    
    .login-form {
        text-align: left;
        margin-bottom: 24px;
    }
    
    .input-group {
        margin-bottom: 20px;
    }
    
    .input-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
    }
    
    .input-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .input-group input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .input-group input:disabled {
        background-color: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
    }
    
    .login-btn {
        width: 100%;
        padding: 14px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .login-btn:hover {
        background: #2563eb;
    }
    
    .login-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .footer {
        color: #6b7280;
        font-size: 14px;
    }
    
    .footer a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
    }
    
    .footer a:hover {
        text-decoration: underline;
    }
    
    @media (max-width: 480px) {
        .login-card {
            padding: 24px;
        }
        
        .title {
            font-size: 24px;
        }
    }
</style>
