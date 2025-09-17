import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	define: {
        'process.env.OSLO_PASSWORD_DISABLE_NATIVE': '"1"'
    }
});
