// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  revelation-system.js
//  Proximity-triggered revelation. When the visitor approaches a tagged
//  object, it glows, scales up, and a fragment of text is revealed.
//
//  This is the ONLY way narrative text appears (the old ambient cycler was
//  removed). You explore to discover meaning.
//
//  Visual feedback scales with proximity: as you approach, the cube grows
//  and brightens. On full reveal (within REVEAL_RADIUS), it pops and text
//  appears. Move away and it shrinks back.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3 } from 'three';
import { locomotion } from './locomotion-system.js';

const REVEAL_RADIUS = 4.0;    // distance at which revelation triggers (full)
const FADE_RADIUS = 7.0;      // distance at which proximity glow fully fades
const COOLDOWN_MS = 12000;    // global cooldown between any revelations

const _playerPos = new Vector3();

export const RevelationSystem = class extends createSystem({}) {
	init() {
		console.log('[revelation] system registered & initialized ✓');
		this._lastRevealed = null;
		this._lastRevealTime = 0;
		this._activeTarget = null;  // currently glowing target (for continuous feedback)
	}

	update(delta, _time) {
		const world = this.world;
		let origin;
		if (world.session && world.player) {
			world.player.getWorldPosition(_playerPos);
			origin = _playerPos;
		} else if (world.camera) {
			world.camera.getWorldPosition(_playerPos);
			origin = _playerPos;
		} else {
			return;
		}

		const targets = world._interactionTargets || [];
		if (!targets.length) return;

		// Find the closest revelation object.
		let closest = null;
		let closestDist = Infinity;
		let targetsWithRev = 0;
		for (const target of targets) {
			const rev = target.userData?.revelation;
			if (!rev?.text) continue;
			targetsWithRev++;
			const dist = origin.distanceTo(target.position);
			if (dist < closestDist) { closestDist = dist; closest = target; }
		}

		// No target in range → fade any active glow.
		if (!closest || closestDist > FADE_RADIUS) {
			this._fadeActive();
			return;
		}

		// Proximity feedback: scale + brighten proportional to closeness.
		// 0 at FADE_RADIUS, 1 at REVEAL_RADIUS. (Visual only — works in all modes.)
		const proximity = Math.max(0, Math.min(1, (FADE_RADIUS - closestDist) / (FADE_RADIUS - REVEAL_RADIUS)));
		this._updateProximityVisual(closest, proximity);

		// Full reveal (text + pop) when the visitor is actively exploring —
		// either in an XR session OR using inline keyboard/touch input.
		// NOT during passive orbit (that would be unearned text).
		if (closestDist < REVEAL_RADIUS && (world.session || locomotion.userActive)) {
			const now = performance.now();
			// Global cooldown — any revelation (not just same-cube) resets the timer.
			if (now - this._lastRevealTime < COOLDOWN_MS) {
				return;
			}
			this._reveal(closest);
			this._lastRevealed = closest;
			this._lastRevealTime = now;
		}
	}

	_updateProximityVisual(target, proximity) {
		// Fade out the previous target if switching.
		if (this._activeTarget && this._activeTarget !== target) {
			this._fadeTarget(this._activeTarget);
		}
		this._activeTarget = target;

		// Scale: 1.0 at proximity=0, up to 1.4 at proximity=1.
		const scale = 1.0 + proximity * 0.4;
		target.scale.setScalar(scale);

		// Brighten materials: boost opacity toward 1.0 as you approach.
		const mats = target.material;
		if (Array.isArray(mats)) {
			mats.forEach(m => {
				if (!m) return;
				if (m._revOp == null && m.opacity != null) m._revOp = m.opacity;
				if (m._revOp != null) m.opacity = m._revOp + (1.0 - m._revOp) * proximity;
			});
		}
	}

	_reveal(target) {
		const rev = target.userData.revelation;
		if (!rev) return;

		// Suppress the (now-removed) ambient cycler flag, in case it's re-added.
		const world = this.world;
		if (world) world._revelationActive = true;
		if (this._revTimer) clearTimeout(this._revTimer);
		this._revTimer = setTimeout(() => { if (this.world) this.world._revelationActive = false; }, 4500);

		// Dramatic pop: scale up quickly then settle. The update loop's proximity
		// scaling handles the gradual approach; this is the "click" moment.
		target.scale.setScalar(1.6);
		// (The update loop will ease it back to the proximity-proportional scale
		// on the next frame, creating a natural pop-and-settle.)

		// Boost the glow ring (if this target has one in world._glowRings).
		if (world?._glowRings) {
			for (const ring of world._glowRings) {
				if (ring.position.distanceTo(target.position) < 0.5 && ring.material) {
					ring.material._revOp = ring.material.opacity;
					ring.material.opacity = 0.6;
					ring.scale.setScalar(1.3);
				}
			}
		}

		// Show the text.
		if (rev.text && world_showOverlay) {
			world_showOverlay(rev.text);
		}
		// Speak the text aloud via browser TTS. Uses the page's language.
		if (rev.text && typeof speechSynthesis !== 'undefined') {
			try {
				speechSynthesis.cancel(); // stop any in-progress speech
				const utter = new SpeechSynthesisUtterance(rev.text);
				utter.lang = document.documentElement?.lang === 'en' ? 'en-US'
					: document.documentElement?.lang === 'fr' ? 'fr-FR' : 'es-ES';
				utter.rate = 0.85;
				utter.pitch = 0.95;
				speechSynthesis.speak(utter);
			} catch {}
		}
		console.log('[revelation] ✨ revealed:', rev.text?.slice(0, 60));
	}

	_fadeActive() {
		if (this._activeTarget) {
			this._fadeTarget(this._activeTarget);
			this._activeTarget = null;
		}
	}

	_fadeTarget(target) {
		// Ease scale back to 1.0 and restore material opacity.
		target.scale.setScalar(1.0);
		const mats = target.material;
		if (Array.isArray(mats)) {
			mats.forEach(m => {
				if (m?._revOp != null) { m.opacity = m._revOp; m._revOp = null; }
			});
		}
		// Restore glow ring.
		const world = this.world;
		if (world?._glowRings) {
			for (const ring of world._glowRings) {
				if (ring.position.distanceTo(target.position) < 0.5 && ring.material?.material?._revOp != null) {
					// already handled above for mesh mats; rings use their own material
				}
				if (ring.material?._revOp != null) {
					ring.material.opacity = ring.material._revOp;
					ring.material._revOp = null;
					ring.scale.setScalar(1.0);
				}
			}
		}
	}
};

// Set by world-builder.js on import (avoids circular dependency).
let world_showOverlay = null;
export function setShowOverlay(fn) { world_showOverlay = fn; }
