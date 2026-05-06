export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35'),
	() => import('./nodes/36'),
	() => import('./nodes/37'),
	() => import('./nodes/38'),
	() => import('./nodes/39'),
	() => import('./nodes/40'),
	() => import('./nodes/41'),
	() => import('./nodes/42'),
	() => import('./nodes/43')
];

export const server_loads = [0,3,2];

export const dictionary = {
		"/": [~7],
		"/account": [~11],
		"/admin": [~12,[3],[4]],
		"/admin/analytics": [~13,[3],[4]],
		"/admin/bottles": [~14,[3],[4]],
		"/admin/invitations": [15,[3],[4]],
		"/admin/users": [~16,[3],[4]],
		"/agora": [~17],
		"/agora/community": [~18],
		"/ar/demo": [19,[6]],
		"/audio": [~20],
		"/card/[id]": [~21],
		"/confirmation-success": [22],
		"/evaluate": [~23],
		"/(auth-pages)/forgot-password": [8,[2]],
		"/games": [~24],
		"/games/booty": [~25],
		"/games/booty/arbooty": [~26],
		"/games/booty/arbooty/create": [27],
		"/invite/[token]": [~28],
		"/(auth-pages)/login": [~9,[2]],
		"/privacy": [29],
		"/profile": [~30],
		"/refine": [~31],
		"/reset-password": [32],
		"/reviews": [33],
		"/(auth-pages)/signup": [10,[2]],
		"/stats": [~34],
		"/terms": [35],
		"/test-upload": [36],
		"/test-utf8": [37],
		"/write": [~38],
		"/write/new": [~40],
		"/write/[username]": [~39],
		"/writings": [~41],
		"/writings/[id]": [~42],
		"/writings/[id]/edit": [~43]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';