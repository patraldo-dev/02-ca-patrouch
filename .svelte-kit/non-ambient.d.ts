
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(auth-pages)" | "/" | "/account" | "/admin" | "/admin/analytics" | "/admin/invitations" | "/admin/users" | "/agora" | "/agora/community" | "/api" | "/api/account" | "/api/account/notification-preferences" | "/api/account/privacy" | "/api/admin" | "/api/admin/blog" | "/api/admin/books" | "/api/admin/books/[slug]" | "/api/admin/cleanup" | "/api/admin/fix-schema" | "/api/admin/invite" | "/api/admin/migrate" | "/api/admin/reviews" | "/api/admin/reviews/[id]" | "/api/admin/update-slugs" | "/api/admin/users" | "/api/admin/users/[id]" | "/api/agora" | "/api/agora/community" | "/api/agora/leaderboard" | "/api/agora/stats" | "/api/agora/writings" | "/api/analytics" | "/api/auth" | "/api/auth/logout" | "/api/auth/[...all]" | "/api/books" | "/api/books/[slug]" | "/api/booty-keywords" | "/api/booty-keywords/propose" | "/api/bottlequest" | "/api/bottlequest/bets" | "/api/bottlequest/bot-actions" | "/api/bottlequest/bot-ai-cron" | "/api/bottlequest/chat-command" | "/api/bottlequest/chat" | "/api/bottlequest/chat/ws" | "/api/bottlequest/checkin" | "/api/bottlequest/drift" | "/api/bottlequest/drift/simulate" | "/api/bottlequest/fuel-request" | "/api/bottlequest/join" | "/api/bottlequest/marketplace" | "/api/bottlequest/move" | "/api/bottlequest/transfer" | "/api/bottles" | "/api/bottles/launch" | "/api/bottles/simulate" | "/api/bottles/[id]" | "/api/comments" | "/api/comments/[id]" | "/api/comments/[id]/like" | "/api/comments/[id]/pick" | "/api/comments/[id]/report" | "/api/cron" | "/api/debug" | "/api/debug/books" | "/api/engagement" | "/api/evaluate" | "/api/invite" | "/api/invite/[token]" | "/api/locale" | "/api/narrator" | "/api/newsletter" | "/api/newsletter/send-weekly" | "/api/newsletter/subscribe" | "/api/notifications" | "/api/notifications/create" | "/api/notifications/mark-read" | "/api/onboarding" | "/api/profiles" | "/api/profiles/[id]" | "/api/profiles/[id]/switch" | "/api/profile" | "/api/profile/visibility" | "/api/refine" | "/api/reviews" | "/api/sappho" | "/api/sappho/write" | "/api/search" | "/api/search/index" | "/api/subscribe" | "/api/taller" | "/api/taller/prompts" | "/api/test-book" | "/api/tts" | "/api/tts/api-key" | "/api/tts/cf-api-key" | "/api/tts/deepinfra-api-key" | "/api/upload-image" | "/api/user" | "/api/user/avatar" | "/api/user/avatar/generate" | "/api/user/profile" | "/api/write" | "/api/write/art-prompt" | "/api/write/publish" | "/api/write/stats" | "/api/write/today" | "/api/write/today/action" | "/api/write/writings" | "/api/writing-card" | "/api/writings" | "/api/writings/save" | "/api/writings/[id]" | "/api/writings/[id]/comments-toggle" | "/api/writings/[id]/comments" | "/audio" | "/card" | "/card/[id]" | "/confirmation-success" | "/confirm" | "/evaluate" | "/(auth-pages)/forgot-password" | "/games" | "/games/booty" | "/images" | "/images/[imageID]" | "/invite" | "/invite/[token]" | "/(auth-pages)/login" | "/newsletter" | "/newsletter/confirm" | "/privacy" | "/profile" | "/refine" | "/reset-password" | "/reviews" | "/(auth-pages)/signup" | "/sitemap.xml" | "/stats" | "/terms" | "/test-secrets" | "/test-upload" | "/test-utf8" | "/write" | "/write/new" | "/write/[username]" | "/writings" | "/writings/[id]" | "/writings/[id]/edit";
		RouteParams(): {
			"/api/admin/books/[slug]": { slug: string };
			"/api/admin/reviews/[id]": { id: string };
			"/api/admin/users/[id]": { id: string };
			"/api/auth/[...all]": { all: string };
			"/api/books/[slug]": { slug: string };
			"/api/bottles/[id]": { id: string };
			"/api/comments/[id]": { id: string };
			"/api/comments/[id]/like": { id: string };
			"/api/comments/[id]/pick": { id: string };
			"/api/comments/[id]/report": { id: string };
			"/api/invite/[token]": { token: string };
			"/api/profiles/[id]": { id: string };
			"/api/profiles/[id]/switch": { id: string };
			"/api/writings/[id]": { id: string };
			"/api/writings/[id]/comments-toggle": { id: string };
			"/api/writings/[id]/comments": { id: string };
			"/card/[id]": { id: string };
			"/images/[imageID]": { imageID: string };
			"/invite/[token]": { token: string };
			"/write/[username]": { username: string };
			"/writings/[id]": { id: string };
			"/writings/[id]/edit": { id: string }
		};
		LayoutParams(): {
			"/(auth-pages)": Record<string, never>;
			"/": { slug?: string; id?: string; all?: string; token?: string; imageID?: string; username?: string };
			"/account": Record<string, never>;
			"/admin": Record<string, never>;
			"/admin/analytics": Record<string, never>;
			"/admin/invitations": Record<string, never>;
			"/admin/users": Record<string, never>;
			"/agora": Record<string, never>;
			"/agora/community": Record<string, never>;
			"/api": { slug?: string; id?: string; all?: string; token?: string };
			"/api/account": Record<string, never>;
			"/api/account/notification-preferences": Record<string, never>;
			"/api/account/privacy": Record<string, never>;
			"/api/admin": { slug?: string; id?: string };
			"/api/admin/blog": Record<string, never>;
			"/api/admin/books": { slug?: string };
			"/api/admin/books/[slug]": { slug: string };
			"/api/admin/cleanup": Record<string, never>;
			"/api/admin/fix-schema": Record<string, never>;
			"/api/admin/invite": Record<string, never>;
			"/api/admin/migrate": Record<string, never>;
			"/api/admin/reviews": { id?: string };
			"/api/admin/reviews/[id]": { id: string };
			"/api/admin/update-slugs": Record<string, never>;
			"/api/admin/users": { id?: string };
			"/api/admin/users/[id]": { id: string };
			"/api/agora": Record<string, never>;
			"/api/agora/community": Record<string, never>;
			"/api/agora/leaderboard": Record<string, never>;
			"/api/agora/stats": Record<string, never>;
			"/api/agora/writings": Record<string, never>;
			"/api/analytics": Record<string, never>;
			"/api/auth": { all?: string };
			"/api/auth/logout": Record<string, never>;
			"/api/auth/[...all]": { all: string };
			"/api/books": { slug?: string };
			"/api/books/[slug]": { slug: string };
			"/api/booty-keywords": Record<string, never>;
			"/api/booty-keywords/propose": Record<string, never>;
			"/api/bottlequest": Record<string, never>;
			"/api/bottlequest/bets": Record<string, never>;
			"/api/bottlequest/bot-actions": Record<string, never>;
			"/api/bottlequest/bot-ai-cron": Record<string, never>;
			"/api/bottlequest/chat-command": Record<string, never>;
			"/api/bottlequest/chat": Record<string, never>;
			"/api/bottlequest/chat/ws": Record<string, never>;
			"/api/bottlequest/checkin": Record<string, never>;
			"/api/bottlequest/drift": Record<string, never>;
			"/api/bottlequest/drift/simulate": Record<string, never>;
			"/api/bottlequest/fuel-request": Record<string, never>;
			"/api/bottlequest/join": Record<string, never>;
			"/api/bottlequest/marketplace": Record<string, never>;
			"/api/bottlequest/move": Record<string, never>;
			"/api/bottlequest/transfer": Record<string, never>;
			"/api/bottles": { id?: string };
			"/api/bottles/launch": Record<string, never>;
			"/api/bottles/simulate": Record<string, never>;
			"/api/bottles/[id]": { id: string };
			"/api/comments": { id?: string };
			"/api/comments/[id]": { id: string };
			"/api/comments/[id]/like": { id: string };
			"/api/comments/[id]/pick": { id: string };
			"/api/comments/[id]/report": { id: string };
			"/api/cron": Record<string, never>;
			"/api/debug": Record<string, never>;
			"/api/debug/books": Record<string, never>;
			"/api/engagement": Record<string, never>;
			"/api/evaluate": Record<string, never>;
			"/api/invite": { token?: string };
			"/api/invite/[token]": { token: string };
			"/api/locale": Record<string, never>;
			"/api/narrator": Record<string, never>;
			"/api/newsletter": Record<string, never>;
			"/api/newsletter/send-weekly": Record<string, never>;
			"/api/newsletter/subscribe": Record<string, never>;
			"/api/notifications": Record<string, never>;
			"/api/notifications/create": Record<string, never>;
			"/api/notifications/mark-read": Record<string, never>;
			"/api/onboarding": Record<string, never>;
			"/api/profiles": { id?: string };
			"/api/profiles/[id]": { id: string };
			"/api/profiles/[id]/switch": { id: string };
			"/api/profile": Record<string, never>;
			"/api/profile/visibility": Record<string, never>;
			"/api/refine": Record<string, never>;
			"/api/reviews": Record<string, never>;
			"/api/sappho": Record<string, never>;
			"/api/sappho/write": Record<string, never>;
			"/api/search": Record<string, never>;
			"/api/search/index": Record<string, never>;
			"/api/subscribe": Record<string, never>;
			"/api/taller": Record<string, never>;
			"/api/taller/prompts": Record<string, never>;
			"/api/test-book": Record<string, never>;
			"/api/tts": Record<string, never>;
			"/api/tts/api-key": Record<string, never>;
			"/api/tts/cf-api-key": Record<string, never>;
			"/api/tts/deepinfra-api-key": Record<string, never>;
			"/api/upload-image": Record<string, never>;
			"/api/user": Record<string, never>;
			"/api/user/avatar": Record<string, never>;
			"/api/user/avatar/generate": Record<string, never>;
			"/api/user/profile": Record<string, never>;
			"/api/write": Record<string, never>;
			"/api/write/art-prompt": Record<string, never>;
			"/api/write/publish": Record<string, never>;
			"/api/write/stats": Record<string, never>;
			"/api/write/today": Record<string, never>;
			"/api/write/today/action": Record<string, never>;
			"/api/write/writings": Record<string, never>;
			"/api/writing-card": Record<string, never>;
			"/api/writings": { id?: string };
			"/api/writings/save": Record<string, never>;
			"/api/writings/[id]": { id: string };
			"/api/writings/[id]/comments-toggle": { id: string };
			"/api/writings/[id]/comments": { id: string };
			"/audio": Record<string, never>;
			"/card": { id?: string };
			"/card/[id]": { id: string };
			"/confirmation-success": Record<string, never>;
			"/confirm": Record<string, never>;
			"/evaluate": Record<string, never>;
			"/(auth-pages)/forgot-password": Record<string, never>;
			"/games": Record<string, never>;
			"/games/booty": Record<string, never>;
			"/images": { imageID?: string };
			"/images/[imageID]": { imageID: string };
			"/invite": { token?: string };
			"/invite/[token]": { token: string };
			"/(auth-pages)/login": Record<string, never>;
			"/newsletter": Record<string, never>;
			"/newsletter/confirm": Record<string, never>;
			"/privacy": Record<string, never>;
			"/profile": Record<string, never>;
			"/refine": Record<string, never>;
			"/reset-password": Record<string, never>;
			"/reviews": Record<string, never>;
			"/(auth-pages)/signup": Record<string, never>;
			"/sitemap.xml": Record<string, never>;
			"/stats": Record<string, never>;
			"/terms": Record<string, never>;
			"/test-secrets": Record<string, never>;
			"/test-upload": Record<string, never>;
			"/test-utf8": Record<string, never>;
			"/write": { username?: string };
			"/write/new": Record<string, never>;
			"/write/[username]": { username: string };
			"/writings": { id?: string };
			"/writings/[id]": { id: string };
			"/writings/[id]/edit": { id: string }
		};
		Pathname(): "/" | "/account" | "/admin" | "/admin/analytics" | "/admin/invitations" | "/admin/users" | "/agora" | "/agora/community" | "/api/account/notification-preferences" | "/api/account/privacy" | "/api/admin" | "/api/admin/blog" | "/api/admin/books" | `/api/admin/books/${string}` & {} | "/api/admin/cleanup" | "/api/admin/fix-schema" | "/api/admin/invite" | "/api/admin/migrate" | "/api/admin/reviews" | `/api/admin/reviews/${string}` & {} | "/api/admin/update-slugs" | "/api/admin/users" | `/api/admin/users/${string}` & {} | "/api/agora/community" | "/api/agora/leaderboard" | "/api/agora/stats" | "/api/agora/writings" | "/api/analytics" | `/api/auth/${string}` & {} | "/api/books" | `/api/books/${string}` & {} | "/api/booty-keywords" | "/api/booty-keywords/propose" | "/api/bottlequest/bets" | "/api/bottlequest/bot-actions" | "/api/bottlequest/bot-ai-cron" | "/api/bottlequest/chat-command" | "/api/bottlequest/chat/ws" | "/api/bottlequest/checkin" | "/api/bottlequest/drift/simulate" | "/api/bottlequest/fuel-request" | "/api/bottlequest/join" | "/api/bottlequest/marketplace" | "/api/bottlequest/move" | "/api/bottlequest/transfer" | "/api/bottles" | "/api/bottles/launch" | "/api/bottles/simulate" | `/api/bottles/${string}` & {} | `/api/comments/${string}` & {} | `/api/comments/${string}/like` & {} | `/api/comments/${string}/pick` & {} | `/api/comments/${string}/report` & {} | "/api/cron" | "/api/debug/books" | "/api/engagement" | "/api/evaluate" | `/api/invite/${string}` & {} | "/api/locale" | "/api/narrator" | "/api/newsletter/send-weekly" | "/api/newsletter/subscribe" | "/api/notifications" | "/api/notifications/create" | "/api/notifications/mark-read" | "/api/onboarding" | "/api/profiles" | `/api/profiles/${string}` & {} | `/api/profiles/${string}/switch` & {} | "/api/profile/visibility" | "/api/refine" | "/api/reviews" | "/api/sappho/write" | "/api/search" | "/api/search/index" | "/api/subscribe" | "/api/taller/prompts" | "/api/test-book" | "/api/tts" | "/api/tts/api-key" | "/api/tts/cf-api-key" | "/api/tts/deepinfra-api-key" | "/api/upload-image" | "/api/user/avatar" | "/api/user/avatar/generate" | "/api/user/profile" | "/api/write/art-prompt" | "/api/write/publish" | "/api/write/stats" | "/api/write/today" | "/api/write/today/action" | "/api/write/writings" | "/api/writing-card" | "/api/writings/save" | `/api/writings/${string}` & {} | `/api/writings/${string}/comments-toggle` & {} | `/api/writings/${string}/comments` & {} | "/audio" | `/card/${string}` & {} | "/confirmation-success" | "/confirm" | "/evaluate" | "/forgot-password" | "/games" | "/games/booty" | `/images/${string}` & {} | `/invite/${string}` & {} | "/login" | "/newsletter/confirm" | "/privacy" | "/profile" | "/refine" | "/reset-password" | "/reviews" | "/signup" | "/sitemap.xml" | "/stats" | "/terms" | "/test-secrets" | "/test-upload" | "/test-utf8" | "/write" | "/write/new" | `/write/${string}` & {} | "/writings" | `/writings/${string}` & {} | `/writings/${string}/edit` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/favicon.ico" | "/robots.txt" | string & {};
	}
}