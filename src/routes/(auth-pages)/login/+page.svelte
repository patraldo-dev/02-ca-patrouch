<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    export let data;
    
    let identifier = '';
    let password = '';
    let error = data?.errorMessage || '';
    let isLoading = false;
    
    async function handleLogin() {
        isLoading = true;
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            const result = await response.json();
            error = result.error || 'Login failed';
            isLoading = false;
        }
    }
</script>

<div class="container">
    <h1>Login</h1>
    
    {#if error}
        <p class="error">{error}</p>
    {/if}
    
    <form on:submit|preventDefault={handleLogin}>
        <div>
            <label for="identifier">Email or Username</label>
            <input id="identifier" bind:value={identifier} type="text" required />
        </div>
        
        <div>
            <label for="password">Password</label>
            <input id="password" bind:value={password} type="password" required />
        </div>
        
        <button type="submit" disabled={isLoading}>
            {#if isLoading}
                Loading...
            {:else}
                Login
            {/if}
        </button>
    </form>
    
    <p>Don't have an account? <a href="/signup">Sign up</a></p>
</div>

<style>
    .container {
        max-width: 400px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .error {
        color: red;
        margin-bottom: 15px;
    }
    
    form div {
        margin-bottom: 15px;
    }
    
    label {
        display: block;
        margin-bottom: 5px;
    }
    
    input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    
    button {
        width: 100%;
        padding: 10px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    button:disabled {
        background: #9ca3af;
    }
</style>
