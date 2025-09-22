<!-- src/routes/(auth-pages)/login/+page.svelte -->
<script>
    import { newWebSocketRpcSession } from 'capnweb';

    let username = '';
    let password = '';
    let error = '';
    let isLoading = false;

    async function handleLogin() {
        isLoading = true;
        error = '';

        try {
            const api = newWebSocketRpcSession('/api/rpc');
            const { session, setCookie } = await api.login(username, password);

            // Set cookie
            const cookieParts = [
                `${setCookie.name}=${setCookie.value}`,
                `path=${setCookie.attributes.path}`,
                `max-age=${setCookie.attributes.maxAge}`
            ];
            if (setCookie.attributes.secure) cookieParts.push('secure');
            if (setCookie.attributes.httpOnly) cookieParts.push('httponly');
            cookieParts.push(`samesite=${setCookie.attributes.sameSite}`);
            document.cookie = cookieParts.join('; ');

            // Redirect or store session
            window.location.href = '/dashboard';

        } catch (err) {
            error = err.message || 'Login failed';
        } finally {
            isLoading = false;
        }
    }
</script>

<form on:submit|preventDefault={handleLogin}>
    <h2>Login</h2>
    <input bind:value={username} placeholder="Username" required />
    <input bind:value={password} type="password" placeholder="Password" required />
    {#if error}<p style="color: red;">{error}</p>{/if}
    <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
    </button>
</form>
