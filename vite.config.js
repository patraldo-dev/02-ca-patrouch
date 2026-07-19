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
	],
	define: {
        'process.env.OSLO_PASSWORD_DISABLE_NATIVE': '"1"'
    },
	// ── Vendor chunk splitting ──
	// @iwsdk/core re-exports symbols from elics (e.g. ComponentRegistry,
	// createComponent) via live bindings, and our world files import BOTH
	// packages. When Vite bundles them into one chunk, the circular
	// re-export creates a TDZ ("Cannot access 'X' before initialization")
	// because some module-eval code runs before elics's static class
	// fields (ComponentRegistry.components = new Map()) finish initializing.
	// Splitting each vendor into its own chunk forces deterministic eval
	// order: elics fully evaluates before @iwsdk/core, before three, etc.
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('/elics/')) return 'vendor-elics';
						if (id.includes('/@iwsdk/')) return 'vendor-iwsdk';
						if (id.includes('/three/') || id.includes('/three/examples/')) return 'vendor-three';
						if (id.includes('/three-mesh-bvh/')) return 'vendor-bvh';
						if (id.includes('/iwer/') || id.includes('/@iwer/')) return 'vendor-iwer';
						if (id.includes('/@preact/') || id.includes('/signals-core/')) return 'vendor-signals';
						if (id.includes('/@pmndrs/') || id.includes('/@babylonjs/')) return 'vendor-iwsdk-deps';
					}
				}
			}
		}
	}
});
