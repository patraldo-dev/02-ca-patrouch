export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".assetsignore","favicon.ico","robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: null,
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js')),
			__memo(() => import('./nodes/27.js')),
			__memo(() => import('./nodes/28.js')),
			__memo(() => import('./nodes/29.js')),
			__memo(() => import('./nodes/30.js')),
			__memo(() => import('./nodes/31.js')),
			__memo(() => import('./nodes/32.js')),
			__memo(() => import('./nodes/33.js')),
			__memo(() => import('./nodes/34.js')),
			__memo(() => import('./nodes/35.js')),
			__memo(() => import('./nodes/36.js')),
			__memo(() => import('./nodes/37.js')),
			__memo(() => import('./nodes/38.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/account",
				pattern: /^\/account\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,4,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/admin/analytics",
				pattern: /^\/admin\/analytics\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,4,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/admin/invitations",
				pattern: /^\/admin\/invitations\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,4,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/admin/users",
				pattern: /^\/admin\/users\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,4,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/agora",
				pattern: /^\/agora\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/agora/community",
				pattern: /^\/agora\/community\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/api/account/notification-preferences",
				pattern: /^\/api\/account\/notification-preferences\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/account/notification-preferences/_server.js'))
			},
			{
				id: "/api/account/privacy",
				pattern: /^\/api\/account\/privacy\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/account/privacy/_server.js'))
			},
			{
				id: "/api/admin",
				pattern: /^\/api\/admin\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/_server.js'))
			},
			{
				id: "/api/admin/blog",
				pattern: /^\/api\/admin\/blog\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/blog/_server.js'))
			},
			{
				id: "/api/admin/books",
				pattern: /^\/api\/admin\/books\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/books/_server.js'))
			},
			{
				id: "/api/admin/books/[slug]",
				pattern: /^\/api\/admin\/books\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/books/_slug_/_server.js'))
			},
			{
				id: "/api/admin/cleanup",
				pattern: /^\/api\/admin\/cleanup\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/cleanup/_server.js'))
			},
			{
				id: "/api/admin/fix-schema",
				pattern: /^\/api\/admin\/fix-schema\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/fix-schema/_server.js'))
			},
			{
				id: "/api/admin/invite",
				pattern: /^\/api\/admin\/invite\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/invite/_server.js'))
			},
			{
				id: "/api/admin/migrate",
				pattern: /^\/api\/admin\/migrate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/migrate/_server.js'))
			},
			{
				id: "/api/admin/reviews",
				pattern: /^\/api\/admin\/reviews\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/reviews/_server.js'))
			},
			{
				id: "/api/admin/reviews/[id]",
				pattern: /^\/api\/admin\/reviews\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/reviews/_id_/_server.js'))
			},
			{
				id: "/api/admin/update-slugs",
				pattern: /^\/api\/admin\/update-slugs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/update-slugs/_server.js'))
			},
			{
				id: "/api/admin/users",
				pattern: /^\/api\/admin\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/users/_server.js'))
			},
			{
				id: "/api/admin/users/[id]",
				pattern: /^\/api\/admin\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/users/_id_/_server.js'))
			},
			{
				id: "/api/agora/community",
				pattern: /^\/api\/agora\/community\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agora/community/_server.js'))
			},
			{
				id: "/api/agora/leaderboard",
				pattern: /^\/api\/agora\/leaderboard\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agora/leaderboard/_server.js'))
			},
			{
				id: "/api/agora/stats",
				pattern: /^\/api\/agora\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agora/stats/_server.js'))
			},
			{
				id: "/api/agora/writings",
				pattern: /^\/api\/agora\/writings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agora/writings/_server.js'))
			},
			{
				id: "/api/analytics",
				pattern: /^\/api\/analytics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/analytics/_server.js'))
			},
			{
				id: "/api/auth/[...all]",
				pattern: /^\/api\/auth(?:\/([^]*))?\/?$/,
				params: [{"name":"all","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/_...all_/_server.js'))
			},
			{
				id: "/api/books",
				pattern: /^\/api\/books\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/books/_server.js'))
			},
			{
				id: "/api/books/[slug]",
				pattern: /^\/api\/books\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/books/_slug_/_server.js'))
			},
			{
				id: "/api/booty-keywords",
				pattern: /^\/api\/booty-keywords\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/booty-keywords/_server.js'))
			},
			{
				id: "/api/booty-keywords/propose",
				pattern: /^\/api\/booty-keywords\/propose\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/booty-keywords/propose/_server.js'))
			},
			{
				id: "/api/bottlequest/bets",
				pattern: /^\/api\/bottlequest\/bets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/bets/_server.js'))
			},
			{
				id: "/api/bottlequest/bot-actions",
				pattern: /^\/api\/bottlequest\/bot-actions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/bot-actions/_server.js'))
			},
			{
				id: "/api/bottlequest/bot-ai-cron",
				pattern: /^\/api\/bottlequest\/bot-ai-cron\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/bot-ai-cron/_server.js'))
			},
			{
				id: "/api/bottlequest/chat-command",
				pattern: /^\/api\/bottlequest\/chat-command\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/chat-command/_server.js'))
			},
			{
				id: "/api/bottlequest/chat/ws",
				pattern: /^\/api\/bottlequest\/chat\/ws\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/chat/ws/_server.js'))
			},
			{
				id: "/api/bottlequest/checkin",
				pattern: /^\/api\/bottlequest\/checkin\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/checkin/_server.js'))
			},
			{
				id: "/api/bottlequest/drift/simulate",
				pattern: /^\/api\/bottlequest\/drift\/simulate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/drift/simulate/_server.js'))
			},
			{
				id: "/api/bottlequest/fuel-request",
				pattern: /^\/api\/bottlequest\/fuel-request\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/fuel-request/_server.js'))
			},
			{
				id: "/api/bottlequest/join",
				pattern: /^\/api\/bottlequest\/join\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/join/_server.js'))
			},
			{
				id: "/api/bottlequest/marketplace",
				pattern: /^\/api\/bottlequest\/marketplace\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/marketplace/_server.js'))
			},
			{
				id: "/api/bottlequest/move",
				pattern: /^\/api\/bottlequest\/move\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/move/_server.js'))
			},
			{
				id: "/api/bottlequest/transfer",
				pattern: /^\/api\/bottlequest\/transfer\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottlequest/transfer/_server.js'))
			},
			{
				id: "/api/bottles",
				pattern: /^\/api\/bottles\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottles/_server.js'))
			},
			{
				id: "/api/bottles/launch",
				pattern: /^\/api\/bottles\/launch\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottles/launch/_server.js'))
			},
			{
				id: "/api/bottles/simulate",
				pattern: /^\/api\/bottles\/simulate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottles/simulate/_server.js'))
			},
			{
				id: "/api/bottles/[id]",
				pattern: /^\/api\/bottles\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bottles/_id_/_server.js'))
			},
			{
				id: "/api/comments/[id]",
				pattern: /^\/api\/comments\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/comments/_id_/_server.js'))
			},
			{
				id: "/api/comments/[id]/like",
				pattern: /^\/api\/comments\/([^/]+?)\/like\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/comments/_id_/like/_server.js'))
			},
			{
				id: "/api/comments/[id]/pick",
				pattern: /^\/api\/comments\/([^/]+?)\/pick\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/comments/_id_/pick/_server.js'))
			},
			{
				id: "/api/comments/[id]/report",
				pattern: /^\/api\/comments\/([^/]+?)\/report\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/comments/_id_/report/_server.js'))
			},
			{
				id: "/api/cron",
				pattern: /^\/api\/cron\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/cron/_server.js'))
			},
			{
				id: "/api/debug/books",
				pattern: /^\/api\/debug\/books\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/debug/books/_server.js'))
			},
			{
				id: "/api/engagement",
				pattern: /^\/api\/engagement\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/engagement/_server.js'))
			},
			{
				id: "/api/evaluate",
				pattern: /^\/api\/evaluate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/evaluate/_server.js'))
			},
			{
				id: "/api/invite/[token]",
				pattern: /^\/api\/invite\/([^/]+?)\/?$/,
				params: [{"name":"token","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/invite/_token_/_server.js'))
			},
			{
				id: "/api/locale",
				pattern: /^\/api\/locale\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/locale/_server.js'))
			},
			{
				id: "/api/narrator",
				pattern: /^\/api\/narrator\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/narrator/_server.js'))
			},
			{
				id: "/api/newsletter/send-weekly",
				pattern: /^\/api\/newsletter\/send-weekly\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/newsletter/send-weekly/_server.js'))
			},
			{
				id: "/api/newsletter/subscribe",
				pattern: /^\/api\/newsletter\/subscribe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/newsletter/subscribe/_server.js'))
			},
			{
				id: "/api/notifications",
				pattern: /^\/api\/notifications\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/_server.js'))
			},
			{
				id: "/api/notifications/create",
				pattern: /^\/api\/notifications\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/create/_server.js'))
			},
			{
				id: "/api/notifications/mark-read",
				pattern: /^\/api\/notifications\/mark-read\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/mark-read/_server.js'))
			},
			{
				id: "/api/onboarding",
				pattern: /^\/api\/onboarding\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/onboarding/_server.js'))
			},
			{
				id: "/api/profiles",
				pattern: /^\/api\/profiles\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/profiles/_server.js'))
			},
			{
				id: "/api/profiles/[id]",
				pattern: /^\/api\/profiles\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/profiles/_id_/_server.js'))
			},
			{
				id: "/api/profiles/[id]/switch",
				pattern: /^\/api\/profiles\/([^/]+?)\/switch\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/profiles/_id_/switch/_server.js'))
			},
			{
				id: "/api/profile/visibility",
				pattern: /^\/api\/profile\/visibility\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/profile/visibility/_server.js'))
			},
			{
				id: "/api/refine",
				pattern: /^\/api\/refine\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/refine/_server.js'))
			},
			{
				id: "/api/reviews",
				pattern: /^\/api\/reviews\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reviews/_server.js'))
			},
			{
				id: "/api/sappho/write",
				pattern: /^\/api\/sappho\/write\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sappho/write/_server.js'))
			},
			{
				id: "/api/search",
				pattern: /^\/api\/search\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/search/_server.js'))
			},
			{
				id: "/api/search/index",
				pattern: /^\/api\/search\/index\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/search/index/_server.js'))
			},
			{
				id: "/api/subscribe",
				pattern: /^\/api\/subscribe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/subscribe/_server.js'))
			},
			{
				id: "/api/taller/prompts",
				pattern: /^\/api\/taller\/prompts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/taller/prompts/_server.js'))
			},
			{
				id: "/api/test-book",
				pattern: /^\/api\/test-book\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/test-book/_server.js'))
			},
			{
				id: "/api/tts",
				pattern: /^\/api\/tts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tts/_server.js'))
			},
			{
				id: "/api/tts/api-key",
				pattern: /^\/api\/tts\/api-key\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tts/api-key/_server.js'))
			},
			{
				id: "/api/tts/cf-api-key",
				pattern: /^\/api\/tts\/cf-api-key\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tts/cf-api-key/_server.js'))
			},
			{
				id: "/api/tts/deepinfra-api-key",
				pattern: /^\/api\/tts\/deepinfra-api-key\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tts/deepinfra-api-key/_server.js'))
			},
			{
				id: "/api/upload-image",
				pattern: /^\/api\/upload-image\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/upload-image/_server.js'))
			},
			{
				id: "/api/user/avatar",
				pattern: /^\/api\/user\/avatar\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/user/avatar/_server.js'))
			},
			{
				id: "/api/user/avatar/generate",
				pattern: /^\/api\/user\/avatar\/generate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/user/avatar/generate/_server.js'))
			},
			{
				id: "/api/user/profile",
				pattern: /^\/api\/user\/profile\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/user/profile/_server.js'))
			},
			{
				id: "/api/write/art-prompt",
				pattern: /^\/api\/write\/art-prompt\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/art-prompt/_server.js'))
			},
			{
				id: "/api/write/publish",
				pattern: /^\/api\/write\/publish\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/publish/_server.js'))
			},
			{
				id: "/api/write/stats",
				pattern: /^\/api\/write\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/stats/_server.js'))
			},
			{
				id: "/api/write/today",
				pattern: /^\/api\/write\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/today/_server.js'))
			},
			{
				id: "/api/write/today/action",
				pattern: /^\/api\/write\/today\/action\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/today/action/_server.js'))
			},
			{
				id: "/api/write/writings",
				pattern: /^\/api\/write\/writings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/write/writings/_server.js'))
			},
			{
				id: "/api/writing-card",
				pattern: /^\/api\/writing-card\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/writing-card/_server.js'))
			},
			{
				id: "/api/writings/save",
				pattern: /^\/api\/writings\/save\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/writings/save/_server.js'))
			},
			{
				id: "/api/writings/[id]",
				pattern: /^\/api\/writings\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/writings/_id_/_server.js'))
			},
			{
				id: "/api/writings/[id]/comments-toggle",
				pattern: /^\/api\/writings\/([^/]+?)\/comments-toggle\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/writings/_id_/comments-toggle/_server.js'))
			},
			{
				id: "/api/writings/[id]/comments",
				pattern: /^\/api\/writings\/([^/]+?)\/comments\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/writings/_id_/comments/_server.js'))
			},
			{
				id: "/audio",
				pattern: /^\/audio\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/card/[id]",
				pattern: /^\/card\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/confirmation-success",
				pattern: /^\/confirmation-success\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/confirm",
				pattern: /^\/confirm\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/confirm/_server.js'))
			},
			{
				id: "/evaluate",
				pattern: /^\/evaluate\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(auth-pages)/forgot-password",
				pattern: /^\/forgot-password\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/games",
				pattern: /^\/games\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/games/booty",
				pattern: /^\/games\/booty\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/images/[imageID]",
				pattern: /^\/images\/([^/]+?)\/?$/,
				params: [{"name":"imageID","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/images/_imageID_/_server.js'))
			},
			{
				id: "/invite/[token]",
				pattern: /^\/invite\/([^/]+?)\/?$/,
				params: [{"name":"token","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(auth-pages)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/newsletter/confirm",
				pattern: /^\/newsletter\/confirm\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/newsletter/confirm/_server.js'))
			},
			{
				id: "/privacy",
				pattern: /^\/privacy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/profile",
				pattern: /^\/profile\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/refine",
				pattern: /^\/refine\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/reset-password",
				pattern: /^\/reset-password\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/reviews",
				pattern: /^\/reviews\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/(auth-pages)/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/sitemap.xml",
				pattern: /^\/sitemap\.xml\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/sitemap.xml/_server.js'))
			},
			{
				id: "/stats",
				pattern: /^\/stats\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/terms",
				pattern: /^\/terms\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 29 },
				endpoint: null
			},
			{
				id: "/test-secrets",
				pattern: /^\/test-secrets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/test-secrets/_server.js'))
			},
			{
				id: "/test-upload",
				pattern: /^\/test-upload\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 30 },
				endpoint: null
			},
			{
				id: "/test-utf8",
				pattern: /^\/test-utf8\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 31 },
				endpoint: null
			},
			{
				id: "/write",
				pattern: /^\/write\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 32 },
				endpoint: null
			},
			{
				id: "/write/new",
				pattern: /^\/write\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 34 },
				endpoint: null
			},
			{
				id: "/write/[username]",
				pattern: /^\/write\/([^/]+?)\/?$/,
				params: [{"name":"username","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 33 },
				endpoint: null
			},
			{
				id: "/writings",
				pattern: /^\/writings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 35 },
				endpoint: null
			},
			{
				id: "/writings/[id]",
				pattern: /^\/writings\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 36 },
				endpoint: null
			},
			{
				id: "/writings/[id]/edit",
				pattern: /^\/writings\/([^/]+?)\/edit\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 37 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
