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
	() => import('./nodes/36')
];

export const server_loads = [0,3,2];

export const dictionary = {
		"/": [~6],
		"/admin": [~10,[3],[4]],
		"/admin/analytics": [~11,[3],[4]],
		"/admin/invitations": [12,[3],[4]],
		"/admin/users": [~13,[3],[4]],
		"/agora": [~14],
		"/agora/community": [~15],
		"/audio": [~16],
		"/card/[id]": [~17],
		"/confirmation-success": [18],
		"/evaluate": [~19],
		"/(auth-pages)/forgot-password": [7,[2]],
		"/games": [~20],
		"/games/booty": [~21],
		"/invite/[token]": [~22],
		"/(auth-pages)/login": [~8,[2]],
		"/privacy": [23],
		"/profile": [~24],
		"/refine": [~25],
		"/reset-password": [26],
		"/reviews": [27],
		"/(auth-pages)/signup": [9,[2]],
		"/terms": [28],
		"/test-upload": [29],
		"/test-utf8": [30],
		"/write": [~31],
		"/write/new": [~33],
		"/write/[username]": [~32],
		"/writings": [~34],
		"/writings/[id]": [~35],
		"/writings/[id]/edit": [~36]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';