// @ts-nocheck — IWSDK input abstraction
// ═══════════════════════════════════════════════════════════
//  input-adapter.js
//  Unified input surface so gameplay code reads identically on
//  desktop (keyboard/mouse/touch) and in XR (controllers).
//
//  Mirrors IWSDK's StatefulGamepad API (getButtonPressed/Down/Up,
//  getAxesValues, get2DInputValue, getAxesEnteringState) so the
//  LocomotionSystem, InteractionSystem, and GrabSystem never branch
//  on `world.session` for input reading.
//
//  Why not auto-grant an IWER session on desktop (pure Flowerbed)?
//  IWER is dev-only. Production desktop visitors (patrouch.ca) have
//  no headset and no IWER — world.session is genuinely undefined.
//  This adapter abstracts over BOTH real gamepads and inline state.
//
//  Two classes:
//  - InlineGamepad: backed by keyboard/mouse/touch via a source fn
//  - InputAdapter:  switches between InlineGamepad and XR StatefulGamepad
// ═══════════════════════════════════════════════════════════

// AxesState enum — matches IWSDK's @iwsdk/xr-input values.
export const AxesState = {
	Default: 0,
	Up: 1,
	Down: 2,
	Left: 3,
	Right: 4,
};

// Input IDs — same strings IWSDK uses. Passed through opaquely.
export const InputId = {
	Trigger: 'xr-standard-trigger',
	Squeeze: 'xr-standard-squeeze',
	Thumbstick: 'xr-standard-thumbstick',
};

// Snap-turn / teleport zone thresholds (same as the old XR constants).
const SNAP_TURN_MIN = Math.PI / 6;        // 30°
const SNAP_TURN_MAX = (5 * Math.PI) / 6;  // 150°
const STATE_THRESH = 0.8;                 // axes magnitude for Up/Down/Left/Right

// Map {x, y} → AxesState. y < 0 = forward = Up (Three.js convention).
function axesStateFromXY(x, y) {
	const ax = Math.abs(x), ay = Math.abs(y);
	if (ax < STATE_THRESH && ay < STATE_THRESH) return AxesState.Default;
	if (ay >= ax) return y < 0 ? AxesState.Up : AxesState.Down;
	return x < 0 ? AxesState.Left : AxesState.Right;
}

/**
 * InlineGamepad — mirrors StatefulGamepad's read surface, backed by
 * keyboard/mouse/touch via a getSource() closure provided by the
 * locomotion system (which owns the DOM listeners).
 *
 * Source shape: {
 *   keys: { KeyW, KeyA, KeyS, KeyD, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ... },
 *   inlineInput: { x, y, lookX, lookY },   // mobile thumbstick writes x/y
 *   thumbstickActive: bool,                 // true when touch thumbstick is dragging
 *   mouseDown: bool,                        // left mouse held (desktop)
 * }
 *
 * Hand mapping:
 *   left:  WASD or touch-thumbstick → Thumbstick axes (movement)
 *   right: Arrow keys → Thumbstick axes (snap-turn/teleport),
 *          mouseDown → Trigger (grab/select)
 */
export class InlineGamepad {
	constructor(hand, getSource) {
		this.hand = hand;          // 'left' | 'right'
		this.getSource = getSource;
		// Double-buffered per-frame state (like StatefulGamepad's currentIndex/previousIndex)
		this._pressed = {};
		this._pressedPrev = {};
		this._axesValues = {};
		this._axesState = {};
		this._axesStatePrev = {};
	}

	/** Advance edge buffers and read new input. Called once per frame
	 *  by InputAdapter.updateInline() — only in inline mode. */
	update() {
		// Snapshot previous frame
		this._pressedPrev = { ...this._pressed };
		this._axesStatePrev = { ...this._axesState };

		const src = this.getSource();
		if (!src) return;

		if (this.hand === 'left') {
			// Movement: touch thumbstick takes priority, then WASD.
			let x = 0, y = 0;
			if (src.thumbstickActive) {
				x = src.inlineInput.x || 0;
				y = src.inlineInput.y || 0;
			} else {
				if (src.keys?.KeyW) y -= 1;
				if (src.keys?.KeyS) y += 1;
				if (src.keys?.KeyA) x -= 1;
				if (src.keys?.KeyD) x += 1;
			}
			this._axesValues[InputId.Thumbstick] = { x, y };
			this._axesState[InputId.Thumbstick] = axesStateFromXY(x, y);
		} else {
			// Right hand: arrow keys → thumbstick (snap-turn / teleport)
			let x = 0, y = 0;
			if (src.keys?.ArrowLeft) x -= 1;
			if (src.keys?.ArrowRight) x += 1;
			if (src.keys?.ArrowUp) y -= 1;
			if (src.keys?.ArrowDown) y += 1;
			this._axesValues[InputId.Thumbstick] = { x, y };
			this._axesState[InputId.Thumbstick] = axesStateFromXY(x, y);

			// Trigger = mouse held (desktop grab/select)
			this._pressed[InputId.Trigger] = !!src.mouseDown;
		}
	}

	// ── StatefulGamepad-compatible read API ──

	getButtonPressed(id) { return !!this._pressed[id]; }
	getButtonDown(id) { return !!this._pressed[id] && !this._pressedPrev[id]; }
	getButtonUp(id) { return !this._pressed[id] && !!this._pressedPrev[id]; }
	getButtonValue(id) { return this._pressed[id] ? 1 : 0; }
	getAxesValues(id) { return this._axesValues[id] || { x: 0, y: 0 }; }
	get2DInputValue(id) {
		const a = this._axesValues[id] || { x: 0, y: 0 };
		return Math.hypot(a.x, a.y);
	}
	getAxesState(id) { return this._axesState[id] ?? AxesState.Default; }
	getAxesEnteringState(id, state) {
		return this._axesState[id] === state && this._axesStatePrev[id] !== state;
	}
	getAxesLeavingState(id, state) {
		return this._axesState[id] !== state && this._axesStatePrev[id] === state;
	}
}

/**
 * InputAdapter — the single input surface gameplay code reads.
 *
 * In XR mode: delegates to world.input.gamepads.{left,right} (real
 *   StatefulGamepad instances, updated by IWSDK's InputSystem).
 * In inline mode: delegates to InlineGamepad instances (updated by
 *   this.updateInline(), reading from the locomotion system's DOM state).
 *
 * Usage in a system update():
 *   adapter.sync(world);          // pick mode based on session/gamepads
 *   adapter.updateInline();       // advance inline edge buffers (no-op in XR)
 *   const move = adapter.left.getAxesValues(Thumbstick);
 *   const clicked = adapter.right.getButtonDown(Trigger);
 */
export class InputAdapter {
	constructor(getSource) {
		this.getSource = getSource;
		this.mode = 'inline';
		this._inlineLeft = new InlineGamepad('left', getSource);
		this._inlineRight = new InlineGamepad('right', getSource);
		this._xrLeft = null;
		this._xrRight = null;
	}

	/** Detect mode: XR when real gamepads exist, inline otherwise.
	 *  Call once at the top of each update(). */
	sync(world) {
		const gp = world?.input?.gamepads;
		if (gp?.left) {
			this.mode = 'xr';
			this._xrLeft = gp.left;
			this._xrRight = gp.right || null;
		} else {
			this.mode = 'inline';
		}
	}

	/** Advance inline edge buffers from DOM state. No-op in XR mode
	 *  (real StatefulGamepads are updated by IWSDK internally). */
	updateInline() {
		if (this.mode === 'inline') {
			this._inlineLeft.update();
			this._inlineRight.update();
		}
	}

	get left() { return this.mode === 'xr' ? this._xrLeft : this._inlineLeft; }
	get right() { return this.mode === 'xr' ? this._xrRight : this._inlineRight; }
}
