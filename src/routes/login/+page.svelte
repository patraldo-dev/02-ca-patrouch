<!-- src/routes/login/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let identifier = ''; // email or username
    let password = '';
    let error = '';

    const handleSubmit = async (event) => {
        error = '';

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });

        const result = await res.json();

        if (!res.ok) {
            error = result.error || 'Login failed';
            return;
        }

        // Redirect to home on success
        window.location.href = '/';
    };
</script>

<svelte:head>
    <title>Log In — ShelfTalk</title>
</svelte:head>

<div class="container">
    <h1>Log In to Your Account</h1>

    {#if error}
        <div class="alert error">
            ❌ {error}
        </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} use:enhance>
        <div class="form-group">
            <label for="identifier">Email or Username</label>
            <input
                id="identifier"
                name="identifier"
                type="text"
                bind:value={identifier}
                required
                autocomplete="username"
                placeholder="you@example.com or your_username"
            />
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input
                id="password"
                name="password"
                type="password"
                bind:value={password}
                required
                autocomplete="current-password"
                placeholder="••••••••"
            />
        </div>
        <button type="submit" class="btn-primary">
            Log In
        </button>
    </form>

    <p class="mt-4">
        Don’t have an account? <a href="/signup">Sign up</a>
    </p>
</div>

<style>
    .container {
        max-width: 450px;
        margin: 3rem auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h1 {
        text-align: center;
        margin-bottom: 2rem;
        color: #333;
    }
    .form-group {
        margin-bottom: 1.5rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #555;
    }
    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.2s;
    }
    input:focus {
        outline: none;
        border-color: #3b82f6;
    }
    button {
        width: 100%;
        padding: 0.75rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }
    button:hover {
        background: #2563eb;
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        text-align: center;
        font-weight: 500;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }
    .mt-4 {
        margin-top: 1rem;
        text-align: center;
    }
    a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
    }
    a:hover {
        text-decoration: underline;
    }
</style>
