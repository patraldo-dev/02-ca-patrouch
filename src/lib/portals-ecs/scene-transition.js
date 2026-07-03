// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
/**
 * scene-transition.js — randomized cinematic transitions between portal worlds.
 *
 * Each hop picks one of {flash, iris, whip, dissolve} at random. Every effect
 * is tinted to the DESTINATION portal's primary color, so each arrival feels
 * like stepping through that world's own light. ~0.5s each. Pure DOM/CSS
 * overlay so it's independent of the WebGL scene building underneath — the new
 * world constructs while the overlay covers the screen, then reveals.
 *
 * Usage:
 *   import { playTransition } from './scene-transition.js';
 *   await playTransition({ color: '#578947', originX, originY });
 *   // originX/Y optional — where the tap happened (for iris/whip origin).
 */

const TRANSITIONS = ['flash', 'iris', 'whip', 'dissolve'];

function el(tag, style, parent) {
	const node = document.createElement(tag);
	if (style) node.style.cssText = style;
	if (parent) parent.appendChild(node);
	return node;
}

function ease(t) {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animate(duration, onFrame) {
	return new Promise((resolve) => {
		const start = performance.now();
		function tick(now) {
			const t = Math.min(1, (now - start) / duration);
			onFrame(ease(t), t);
			if (t < 1) requestAnimationFrame(tick);
			else resolve();
		}
		requestAnimationFrame(tick);
	});
}

// ── Flash: destination color floods the screen, then fades ──────────────
async function flash(color) {
	const layer = el('div',
		`position:fixed;inset:0;background:${color};opacity:0;z-index:2147483646;pointer-events:none;transition:opacity 0.3s ease;`,
		document.body);
	requestAnimationFrame(() => { layer.style.opacity = '0.85'; });
	await new Promise(r => setTimeout(r, 280));
	layer.style.transition = 'opacity 0.35s ease';
	layer.style.opacity = '0';
	await new Promise(r => setTimeout(r, 360));
	layer.remove();
}

// ── Iris: a ring expands from the tap point, fills, then contracts open ──
async function iris(color, originX, originY) {
	const x = originX ?? window.innerWidth / 2;
	const y = originY ?? window.innerHeight / 2;
	const maxR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

	const fill = el('div',
		`position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:radial-gradient(circle at ${x}px ${y}px, ${color} 0%, ${color}cc 60%, transparent 100%);clip-path:circle(0px at ${x}px ${y}px);`,
		document.body);

	// Expand
	await animate(260, (_, raw) => {
		fill.style.clipPath = `circle(${maxR * raw}px at ${x}px ${y}px)`;
	});
	// Hold + contract open
	await new Promise(r => setTimeout(r, 80));
	await animate(260, (_, raw) => {
		const r = maxR * (1 - raw);
		fill.style.clipPath = `circle(${r}px at ${x}px ${y}px)`;
	});
	fill.remove();
}

// ── Whip: a colored streak sweeps across the screen ─────────────────────
async function whip(color, originX) {
	// Sweep direction follows which side of screen was tapped (default L→R).
	const fromLeft = originX === undefined ? true : originX < window.innerWidth / 2;
	const start = fromLeft ? '-100%' : '100%';
	const end = fromLeft ? '100%' : '-100%';

	const streak = el('div',
		`position:fixed;inset:0;z-index:2147483646;pointer-events:none;` +
		`background:linear-gradient(${fromLeft ? '90deg' : '270deg'}, transparent, ${color} 40%, ${color} 60%, transparent);` +
		`transform:translateX(${start});will-change:transform;`,
		document.body);

	await animate(500, (eased) => {
		const pos = fromLeft ? eased : (1 - eased);
		streak.style.transform = `translateX(${fromLeft ? (eased * 200 - 100) : (100 - eased * 200)}%)`;
	});
	streak.remove();
}

// ── Dissolve: colored particles swarm in, then clear ────────────────────
async function dissolve(color) {
	const layer = el('div',
		`position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:${color};opacity:0;`,
		document.body);

	// Swell in
	await animate(280, (_, raw) => {
		layer.style.opacity = String(0.7 * raw);
		layer.style.filter = `blur(${raw * 12}px)`;
	});
	// Dissolve out
	await animate(320, (_, raw) => {
		layer.style.opacity = String(0.7 * (1 - raw));
		layer.style.filter = `blur(${12 + raw * 20}px)`;
	});
	layer.remove();
}

/**
 * Play a random transition tinted to the destination portal.
 * @param {{ color: string, originX?: number, originY?: number }} opts
 * @returns {Promise<void>} resolves when the reveal is complete
 */
export async function playTransition({ color = '#c9a87c', originX, originY } = {}) {
	const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#c9a87c';
	const kind = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
	try {
		switch (kind) {
			case 'iris':     return await iris(safe, originX, originY);
			case 'whip':     return await whip(safe, originX);
			case 'dissolve': return await dissolve(safe);
			default:         return await flash(safe);
		}
	} catch {
		// Never let a transition failure block navigation.
	}
}

/**
 * Play a specific transition (for testing or deliberate choreography).
 */
export async function playTransitionByName(name, opts = {}) {
	const safe = /^#[0-9a-fA-F]{6}$/.test(opts.color || '') ? opts.color : '#c9a87c';
	switch (name) {
		case 'iris':     return await iris(safe, opts.originX, opts.originY);
		case 'whip':     return await whip(safe, opts.originX);
		case 'dissolve': return await dissolve(safe);
		default:         return await flash(safe);
	}
}
