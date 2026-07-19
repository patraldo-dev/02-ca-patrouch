import { sveltekit } from '@sveltejs/kit/vite';
import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import cloudflareDoExporter from 'sveltekit-cloudflare-durable-objects';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		// IWER emulation. The plugin's HTML injection doesn't reach SvelteKit SSR
		// routes, so we ALSO import its virtual module directly in world-builder.js
		// (import '/@iwer-injection-runtime') to run the bundle in-app. The `ai`
		// option is omitted — it launches a Playwright browser that hangs on this
		// app's Cloudflare bindings.
		iwsdkDev({
			emulator: { device: 'metaQuest3' },
			verbose: true
		}),
		// Export Durable Object classes from the SvelteKit-generated
		// .svelte-kit/cloudflare/_worker.js entry point. Cloudflare requires DO
		// classes to be exported there, but adapter-cloudflare owns that file.
		// This plugin injects the exports idempotently at build time.
		cloudflareDoExporter({
			durableObjects: ['src/do/grab-demo-room.js']
		})
	],
	define: {
        'process.env.OSLO_PASSWORD_DISABLE_NATIVE': '"1"'
    }
});
