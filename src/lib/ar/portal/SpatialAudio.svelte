<script>
  import { onMount, onDestroy } from 'svelte';

  /**
   * SpatialAudio.svelte — Anchors audio to a specific direction using Web Audio HRTF.
   * The narrator proclamation should sound like it's coming from the portal's location,
   * not flat from the phone speaker.
   *
   * Props:
   *   videoElement — <video> element with CF Stream source
   *   azimuth — degrees: 0 = front, 90 = right, -90 = left (from relativeBearing)
   *   elevation — degrees: 0 = level, positive = up, negative = down
   *   active — whether spatial audio is enabled
   */

  let {
    videoElement = null,
    azimuth = 0,
    elevation = 0,
    active = false,
  } = $props();

  let audioContext = null;
  let sourceNode = null;
  let pannerNode = null;
  let gainNode = null;
  let updateTimer = null;
  let isConnected = false;
  let resumePromise = null;

  const UPDATE_INTERVAL_MS = 200;

  onMount(async () => {
    if (!videoElement || typeof AudioContext === 'undefined') return;
  });

  $effect(() => {
    if (active && videoElement) {
      initAudio();
    }
  });

  // Update panner position when azimuth/elevation change (throttled via interval)
  $effect(() => {
    // Just trigger — the interval reads current prop values
    void azimuth;
    void elevation;
  });

  async function initAudio() {
    if (isConnected) return;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Connect video element to audio graph
      sourceNode = audioContext.createMediaElementSource(videoElement);

      // Gain node for volume control
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;

      // HRTF spatial model — most realistic binaural rendering
      pannerNode = audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = 1;       // 1 meter reference
      pannerNode.maxDistance = 50;      // fade out at 50m
      pannerNode.rolloffFactor = 1;
      pannerNode.coneInnerAngle = 360;  // omnidirectional
      pannerNode.coneOuterAngle = 360;

      // Chain: video → panner → gain → destination
      sourceNode.connect(pannerNode);
      pannerNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      isConnected = true;

      // Resume AudioContext (iOS requires user gesture)
      if (audioContext.state === 'suspended') {
        resumePromise = audioContext.resume();
        await resumePromise;
      }

      // Start position update loop
      updatePosition();
      updateTimer = setInterval(updatePosition, UPDATE_INTERVAL_MS);
    } catch (e) {
      console.warn('[SpatialAudio] Init failed:', e.message);
    }
  }

  function updatePosition() {
    if (!pannerNode || !audioContext) return;

    // Convert azimuth/elevation (degrees) to Web Audio 3D coordinates
    // Web Audio: X = right, Y = up, Z = forward (toward listener)
    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (elevation * Math.PI) / 180;

    const x = Math.sin(azRad) * Math.cos(elRad);
    const y = Math.sin(elRad);
    const z = Math.cos(azRad) * Math.cos(elRad);

    const now = audioContext.currentTime;
    pannerNode.positionX.setValueAtTime(x, now);
    pannerNode.positionY.setValueAtTime(y, now);
    pannerNode.positionZ.setValueAtTime(z, now);
  }

  function cleanup() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }

    if (isConnected) {
      try {
        sourceNode?.disconnect();
        pannerNode?.disconnect();
        gainNode?.disconnect();
      } catch (_) {}
      isConnected = false;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }

    audioContext = null;
    sourceNode = null;
    pannerNode = null;
    gainNode = null;
    resumePromise = null;
  }

  onDestroy(() => {
    cleanup();
  });

  // Expose programmatic controls
  export function setVolume(value) {
    if (gainNode && audioContext) {
      gainNode.gain.setValueAtTime(value, audioContext.currentTime);
    }
  }

  export function setRefDistance(meters) {
    if (pannerNode) {
      pannerNode.refDistance = Math.max(0.1, meters);
    }
  }

  export function setMaxDistance(meters) {
    if (pannerNode) {
      pannerNode.maxDistance = Math.max(1, meters);
    }
  }

  export function resume() {
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
  }
</script>

<!-- No visual output — this is a utility component -->
<svelte:window on:focus={() => { if (active && audioContext?.state === 'suspended') resume(); }} />
