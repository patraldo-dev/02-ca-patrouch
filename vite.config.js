import { sveltekit } from '@sveltejs/kit/vite';
import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
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
		})
		// NOTE: Durable Object class export is done via the CLI tool
		// (sveltekit-cloudflare-do) appended to the `build` npm script, NOT via
		// the vite plugin. The plugin's closeBundle hook fires before
		// adapter-cloudflare writes _worker.js, so it can't find the file. The
		// CLI runs after `vite build` completes, when _worker.js exists.
	],
	define: {
        'process.env.OSLO_PASSWORD_DISABLE_NATIVE': '"1"'
    }
});
