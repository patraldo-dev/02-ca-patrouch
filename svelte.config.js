import adapter from "@sveltejs/adapter-cloudflare";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			platformProxy: {
				enabled: true,
				// Proxy ALL bindings to production during local dev.
				// This makes D1, AI, R2, Vectorize, and auth work locally
				// by reading from / writing to the real remote resources.
				remote: true
			},
			routes: {
				include: ['/api/auth/(.*)', '/api/auth']
			}
		})
	}
};

export default config;