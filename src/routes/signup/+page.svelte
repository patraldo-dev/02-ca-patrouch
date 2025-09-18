<!-- src/routes/signup/+page.svelte -->
<script>
    import { enhance } from '$app/forms';

    let email = '';
    let username = '';
    let password = '';
    let error = '';
    let success = false;

    const handleSubmit = async (event) => {
        error = '';
        success = false;

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) {
            error = result.error || 'Signup failed';
            return;
        }

        success = true;
        email = username = password = '';
    };
</script>

<svelte:head>
    <title>Sign Up — ShelfTalk</title>
</svelte:head>

<div class="container">
    <h1>Create Your Account</h1>

    {#if success}
        <div class="alert success">
            ✅ Check your email for a verification link! (check spam, if necessary) 
        </div>
    {:else}
        {#if error}
            <div class="alert error">
                ❌ {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} use:enhance>
            <div class="form-group">
                <label for="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    bind:value={email}
                    required
                    autocomplete="email"
                    placeholder="you@example.com"
                />
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    bind:value={username}
                    required
                    minlength="3"
                    autocomplete="username"
                    placeholder="your_username"
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
                    minlength="6"
                    autocomplete="new-password"
                    placeholder="••••••••"
                />
            </div>
            <button type="submit" class="btn-primary">
                Sign Up
            </button>
        </form>
    {/if}

    <p class="mt-4">
        Already have an account? <a href="/login">Log in</a>
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
    .success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
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
