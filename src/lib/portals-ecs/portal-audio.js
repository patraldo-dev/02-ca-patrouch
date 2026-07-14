// ═══════════════════════════════════════════════════════════
//  portal-audio.js — spoken narration playback + optional subtitles.
//
//  A self-contained module that adds a speaker affordance to a portal scene.
//  On first tap, it fetches the pre-rendered narration audio
//  (GET /api/portals/<id>/narration?locale=<lang>) and plays it. A subtitle
//  toggle shows the narration text as a story panel.
//
//  Usage from a scene module's build function:
//    import { installNarration } from './portal-audio.js';
//    const narration = installNarration({ portalId: config.portal.id, track, lang });
//    // ... in the wrapped world.update:
//    narration.update(delta, time);
//    // ... in cleanup():
//    narration.dispose();
// ═══════════════════════════════════════════════════════════

/**
 * @param {object} opts
 * @param {string} opts.portalId  - the current portal's id
 * @param {Array}  opts.track     - the scene's disposable-elements array (pushed to)
 * @param {string} [opts.lang]    - locale, default 'es'
 * @returns {{ update(dt,time), dispose(), el: HTMLElement }}
 */
export function installNarration({ portalId, track, lang = 'es' }) {
	if (!portalId) return noopNarration();

	const locale = ['es', 'en', 'fr'].includes(lang) ? lang : 'es';
	let audioEl = null;
	let subtitlePanel = null;
	let loaded = false;
	let playing = false;
	let subtitlesOn = false;
	let fetchPromise = null;

	// ── Build the speaker button (corner icon, minimal, non-diegetic v1) ──
	const btn = document.createElement('div');
	btn.id = 'portal-audio-speaker';
	btn.style.cssText = [
		'position:fixed', 'bottom:20px', 'right:20px', 'z-index:99999',
		'width:48px', 'height:48px', 'border-radius:50%',
		'background:rgba(10,6,20,0.7)', 'backdrop-filter:blur(8px)',
		'border:1px solid rgba(200,180,255,0.3)',
		'display:flex', 'align-items:center', 'justify-content:center',
		'cursor:pointer', 'font-size:22px', 'color:#dcd6ff',
		'transition:opacity 0.5s ease, transform 0.2s ease',
		'opacity:0', 'pointer-events:auto', 'user-select:none',
		'box-shadow:0 0 16px rgba(140,100,255,0.2)',
	].join(';');
	btn.textContent = '🔊';
	btn.title = 'Listen to this portal';
	document.body.appendChild(btn);

	// Fade in after a moment so it doesn't flash on scene change
	setTimeout(() => { btn.style.opacity = '0.85'; }, 1200);

	// ── Subtitle toggle (small, below the speaker) ──
	const subBtn = document.createElement('div');
	subBtn.id = 'portal-audio-cc';
	subBtn.style.cssText = [
		'position:fixed', 'bottom:76px', 'right:20px', 'z-index:99999',
		'padding:4px 10px', 'border-radius:14px',
		'background:rgba(10,6,20,0.6)', 'backdrop-filter:blur(8px)',
		'border:1px solid rgba(200,180,255,0.2)',
		'font-size:11px', 'color:rgba(220,214,255,0.7)',
		'cursor:pointer', 'user-select:none',
		'opacity:0', 'transition:opacity 0.5s ease',
		'font-family:Georgia,serif',
	].join(';');
	subBtn.textContent = 'CC';
	subBtn.title = 'Toggle subtitles';
	document.body.appendChild(subBtn);
	setTimeout(() => { subBtn.style.opacity = '0.6'; }, 1400);

	// ── Interaction ──
	btn.addEventListener('pointerdown', (e) => {
		e.stopPropagation();
		togglePlay();
	});
	subBtn.addEventListener('pointerdown', (e) => {
		e.stopPropagation();
		subtitlesOn = !subtitlesOn;
		subBtn.style.color = subtitlesOn ? '#fff' : 'rgba(220,214,255,0.7)';
		if (subtitlesOn && loaded) showSubtitles();
		else hideSubtitles();
	});

	async function togglePlay() {
		if (!loaded && !fetchPromise) {
			btn.textContent = '⟳';
			fetchPromise = loadNarration();
			await fetchPromise;
		}
		if (!loaded) return;
		if (playing) {
			audioEl?.pause();
			playing = false;
			btn.textContent = '🔊';
		} else {
			try {
				await audioEl?.play();
				playing = true;
				btn.textContent = '⏸';
				if (subtitlesOn) showSubtitles();
			} catch (err) {
				console.warn('[narration] play failed:', err.message);
				btn.textContent = '🔊';
			}
		}
	}

	async function loadNarration() {
		try {
			const resp = await fetch(`/api/portals/${portalId}/narration?locale=${locale}`);
			if (!resp.ok) { btn.style.opacity = '0.3'; btn.title = 'No narration available'; return; }
			const data = await resp.json();
			if (!data.audio && !data.text) { btn.style.opacity = '0.3'; return; }

			if (data.audio) {
				// melotts returns base64 mp3; decode to a blob URL for the audio element
				const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
				const blob = new Blob([bytes], { type: 'audio/mp3' });
				const url = URL.createObjectURL(blob);
				audioEl = new Audio(url);
				audioEl.addEventListener('ended', () => {
					playing = false;
					btn.textContent = '🔊';
				});
			}
			// Stash the text for subtitles
			subtitleText = data.text || '';
			loaded = true;
			btn.style.opacity = '0.85';
		} catch (err) {
			console.warn('[narration] load failed:', err.message);
			btn.style.opacity = '0.3';
			btn.title = 'Narration unavailable';
		} finally {
			fetchPromise = null;
		}
	}

	let subtitleText = '';

	function showSubtitles() {
		if (!subtitleText) return;
		hideSubtitles();
		subtitlePanel = document.createElement('div');
		subtitlePanel.id = 'portal-audio-subtitle';
		subtitlePanel.style.cssText = [
			'position:fixed', 'bottom:110px', 'right:20px', 'z-index:99998',
			'max-width:340px', 'max-height:40vh', 'overflow-y:auto',
			'padding:16px 20px', 'border-radius:12px',
			'background:rgba(10,6,20,0.85)', 'backdrop-filter:blur(12px)',
			'border:1px solid rgba(200,180,255,0.25)',
			'color:rgba(230,225,245,0.92)',
			'font-family:Georgia,serif', 'font-size:14px', 'line-height:1.6',
			'letter-spacing:0.02em',
			'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
		].join(';');
		subtitlePanel.textContent = subtitleText;
		document.body.appendChild(subtitlePanel);
	}

	function hideSubtitles() {
		if (subtitlePanel) { subtitlePanel.remove(); subtitlePanel = null; }
	}

	function update() { /* no per-frame work currently; hook for future sync */ }

	function dispose() {
		if (audioEl) { audioEl.pause(); audioEl.src = ''; audioEl = null; }
		hideSubtitles();
		btn.remove();
		subBtn.remove();
	}

	// Push to the scene's track array so cleanup catches it (belt + suspenders).
	if (track) track.push({ parent: document.body, remove() { dispose(); } });

	return { update, dispose, el: btn };
}

function noopNarration() {
	return { update() {}, dispose() {}, el: null };
}
