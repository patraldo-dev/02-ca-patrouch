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
	() => import('./nodes/38')
];

export const server_loads = [0,3,2];

export const dictionary = {
		"/": [~6],
		"/account": [~10],
		"/admin": [~11,[3],[4]],
		"/admin/analytics": [~12,[3],[4]],
		"/admin/invitations": [13,[3],[4]],
		"/admin/users": [~14,[3],[4]],
		"/agora": [~15],
		"/agora/community": [~16],
		"/audio": [~17],
		"/card/[id]": [~18],
		"/confirmation-success": [19],
		"/evaluate": [~20],
		"/(auth-pages)/forgot-password": [7,[2]],
		"/games": [~21],
		"/games/booty": [~22],
		"/invite/[token]": [~23],
		"/(auth-pages)/login": [~8,[2]],
		"/privacy": [24],
		"/profile": [~25],
		"/refine": [~26],
		"/reset-password": [27],
		"/reviews": [28],
		"/(auth-pages)/signup": [9,[2]],
		"/stats": [~29],
		"/terms": [30],
		"/test-upload": [31],
		"/test-utf8": [32],
		"/write": [~33],
		"/write/new": [~35],
		"/write/[username]": [~34],
		"/writings": [~36],
		"/writings/[id]": [~37],
		"/writings/[id]/edit": [~38]
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