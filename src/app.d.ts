// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {}

		// Set in src/hooks.server.js. These mirror exactly what the hooks assign;
		// typed loosely (where the upstream better-auth / Cloudflare types are
		// missing or heavy) so strict checkJs stops flagging every access while
		// still catching real mistakes (e.g. wrong property names).
		interface Locals {
			user: {
				id: string;
				username: string;
				email: string | null;
				email_verified: boolean;
				role: string;
				bio: string | null;
				avatar_url: string | null;
				display_name: string | null;
				created_at: string | null;
			} | null;
			db: any;            // D1Database (event.platform.env.DB_book)
			platform: any;      // App.Platform — see below
			locale: 'en' | 'es' | 'fr';
			auth: any;          // better-auth instance from createAuth()
			session: any;       // better-auth session object or null
		}

		interface PageData {}

		interface PageState {}

		// Cloudflare Workers bindings via adapter-cloudflare.
		// `env` is typed as any because the generated worker-configuration.d.ts
		// carries the full binding types and we don't want to duplicate them here.
		interface Platform {
			env: any;
		}
	}
}

export {};
