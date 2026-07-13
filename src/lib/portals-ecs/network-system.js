// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  network-system.js
//  Multiplayer avatar sync + voice chat.
//
//  Avatar sync: broadcasts local player pose via WebSocket, spawns/updates
//  remote avatar meshes (colored spheres) for other visitors.
//
//  Voice chat: WebRTC P2P audio (mesh topology). The wss:// connection is
//  used for signaling (offer/answer/ICE relay through the PortalRoom DO);
//  audio flows browser-to-browser, never through the worker.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3, Mesh, MeshBasicMaterial, SphereGeometry, Group } from 'three';
import { locomotion } from './locomotion-system.js';

const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/portal-ws/ws';
const SEND_INTERVAL_MS = 80;
const LERP_SPEED = 0.12;

const _localPos = new Vector3();
const _tmpPos = new Vector3();
const _sphereGeo = new SphereGeometry(0.12, 12, 10);

// WebRTC config — Google's free STUN servers. No TURN (acceptable for v1).
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function colorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const h = (Math.abs(hash) % 360) / 360;
  const c = new MeshBasicMaterial({ color: 0xffffff });
  c.color.setHSL(h, 0.6, 0.55);
  return c;
}

function createAvatarMesh(sessionId) {
  const group = new Group();
  const head = new Mesh(_sphereGeo, colorFromId(sessionId));
  head.position.y = 0;
  group.add(head);
  return group;
}

// Module-level voice state (toggled from PortalScene UI).
export const voice = {
  enabled: false,      // has the user enabled voice?
  micReady: false,     // is the mic stream captured?
  muted: false,        // is the mic muted?
};

let _localStream = null;

export async function captureMic() {
  if (_localStream) return _localStream;
  try {
    _localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    voice.micReady = true;
    console.log('[network] mic captured ✓');
    return _localStream;
  } catch (err) {
    console.warn('[network] mic capture failed:', err.message);
    voice.micReady = false;
    return null;
  }
}

export function toggleMute() {
  voice.muted = !voice.muted;
  if (_localStream) {
    _localStream.getAudioTracks().forEach(t => { t.enabled = !voice.muted; });
  }
  return voice.muted;
}

export const NetworkSystem = class extends createSystem({}) {
  init() {
    console.log('[network] system registered & initialized ✓');
    this._userId = crypto.randomUUID();
    this._room = null;
    this._ws = null;
    this._avatars = new Map();       // sessionId → { mesh, targetX, targetY, targetZ, targetYaw }
    this._peers = new Map();         // sessionId → { pc (RTCPeerConnection), audioEl }
    this._lastSend = 0;
    this._lastPos = { x: 0, y: 0, z: 0 };
    this._makingOffer = new Set();   // sessionIds we've initiated an offer to (avoid glare)
  }

  update(delta, _time) {
    const world = this.world;
    const room = world._currentPortalId;
    if (!room) return;

    if (this._room !== room) {
      this._disconnect();
      this._room = room;
      this._connect(room);
    }

    // Read local player position
    let px, py, pz, yaw;
    if (world.session && world.player) {
      world.player.getWorldPosition(_localPos);
      px = _localPos.x; py = _localPos.y; pz = _localPos.z;
      yaw = Math.atan2(world.camera.matrixWorld.elements[8], world.camera.matrixWorld.elements[10]);
    } else if (world.camera) {
      px = world.camera.position.x; py = world.camera.position.y; pz = world.camera.position.z;
      yaw = world.camera.rotation.y;
    } else {
      return;
    }

    // Throttled pose broadcast
    const now = performance.now();
    const moved = Math.abs(px - this._lastPos.x) + Math.abs(py - this._lastPos.y) + Math.abs(pz - this._lastPos.z) > 0.01;
    if ((moved || locomotion.userActive) && now - this._lastSend > SEND_INTERVAL_MS) {
      this._lastSend = now;
      this._lastPos = { x: px, y: py, z: pz };
      if (this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ type: 'pose', x: px, y: py, z: pz, yaw }));
      }
    }

    // Lerp remote avatars
    for (const [sid, avatar] of this._avatars) {
      _tmpPos.set(avatar.targetX, avatar.targetY, avatar.targetZ);
      avatar.mesh.position.lerp(_tmpPos, LERP_SPEED);
      avatar.mesh.rotation.y += (avatar.targetYaw - avatar.mesh.rotation.y) * LERP_SPEED;
    }
  }

  _connect(room) {
    try {
      const url = `${WS_URL}?room=${encodeURIComponent(room)}&user=${this._userId}&name=visitor`;
      this._ws = new WebSocket(url);

      this._ws.onopen = () => {
        console.log('[network] connected to room:', room);
      };

      this._ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._handleMessage(msg);
        } catch {}
      };

      this._ws.onclose = () => {
        console.log('[network] disconnected from room:', room);
        this._ws = null;
      };

      this._ws.onerror = () => {
        console.warn('[network] WebSocket error');
        this._ws = null;
      };
    } catch (err) {
      console.warn('[network] connect failed:', err.message);
    }
  }

  _disconnect() {
    // Close all WebRTC connections
    for (const [sid, peer] of this._peers) {
      try { peer.pc.close(); } catch {}
      if (peer.audioEl) peer.audioEl.remove();
    }
    this._peers.clear();
    this._makingOffer.clear();

    // Remove all remote avatars
    const world = this.world;
    for (const [sid, avatar] of this._avatars) {
      if (world?.scene) world.scene.remove(avatar.mesh);
    }
    this._avatars.clear();

    if (this._ws) {
      try { this._ws.close(); } catch {}
      this._ws = null;
    }
  }

  _handleMessage(msg) {
    const world = this.world;
    if (!world?.scene) return;

    switch (msg.type) {
      case 'roster':
        for (const peer of (msg.peers || [])) {
          this._spawnAvatar(peer.sessionId, peer.x, peer.y, peer.z, peer.yaw);
          // Initiate WebRTC offer to existing peers (we're the newcomer)
          this._initiateCall(peer.sessionId);
        }
        break;

      case 'peer_joined':
        this._spawnAvatar(msg.sessionId, msg.x, msg.y, msg.z, msg.yaw);
        // The NEW peer initiates calls to us (via roster). We don't initiate
        // to avoid glare — the newcomer gets the full roster and offers.
        break;

      case 'peer_pose':
        const avatar = this._avatars.get(msg.sessionId);
        if (avatar) {
          avatar.targetX = msg.x;
          avatar.targetY = msg.y;
          avatar.targetZ = msg.z;
          avatar.targetYaw = msg.yaw;
        }
        break;

      case 'peer_left':
        const existing = this._avatars.get(msg.sessionId);
        if (existing) {
          world.scene.remove(existing.mesh);
          this._avatars.delete(msg.sessionId);
        }
        const peer = this._peers.get(msg.sessionId);
        if (peer) {
          try { peer.pc.close(); } catch {}
          if (peer.audioEl) peer.audioEl.remove();
          this._peers.delete(msg.sessionId);
        }
        break;

      // ── WebRTC signaling ──
      case 'rtc_offer':
        this._handleOffer(msg.from, msg.sdp);
        break;
      case 'rtc_answer':
        this._handleAnswer(msg.from, msg.sdp);
        break;
      case 'rtc_ice':
        this._handleIce(msg.from, msg.candidate);
        break;
    }
  }

  // ── WebRTC P2P voice ──

  async _initiateCall(targetSessionId) {
    if (this._peers.has(targetSessionId)) return;
    if (!voice.enabled) return;  // voice is opt-in

    const stream = await captureMic();
    if (!stream) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this._peers.set(targetSessionId, { pc, audioEl: null });

    // Add local audio track
    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

    // Handle ICE candidates → send via wss to the target
    pc.onicecandidate = (event) => {
      if (event.candidate && this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({
          type: 'rtc_ice', to: targetSessionId, candidate: event.candidate,
        }));
      }
    };

    // Handle remote audio track
    pc.ontrack = (event) => {
      this._setupRemoteAudio(targetSessionId, event.streams[0]);
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this._makingOffer.add(targetSessionId);
    this._ws.send(JSON.stringify({
      type: 'rtc_offer', to: targetSessionId, sdp: offer,
    }));
    console.log('[network] RTC offer sent to', targetSessionId.slice(0, 8));
  }

  async _handleOffer(fromSessionId, sdp) {
    if (!voice.enabled) return;

    // If we already have a connection, or we initiated to them (glare), skip.
    if (this._peers.has(fromSessionId)) return;

    const stream = await captureMic();
    if (!stream) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this._peers.set(fromSessionId, { pc, audioEl: null });

    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({
          type: 'rtc_ice', to: fromSessionId, candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      this._setupRemoteAudio(fromSessionId, event.streams[0]);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this._ws.send(JSON.stringify({
      type: 'rtc_answer', to: fromSessionId, sdp: answer,
    }));
    console.log('[network] RTC answer sent to', fromSessionId.slice(0, 8));
  }

  async _handleAnswer(fromSessionId, sdp) {
    const peer = this._peers.get(fromSessionId);
    if (peer && peer.pc.signalingState !== 'stable') {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('[network] RTC answer received from', fromSessionId.slice(0, 8));
    }
  }

  async _handleIce(fromSessionId, candidate) {
    const peer = this._peers.get(fromSessionId);
    if (peer) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        // may fail if candidate arrives before remote description — ignore
      }
    }
  }

  _setupRemoteAudio(sessionId, stream) {
    const peer = this._peers.get(sessionId);
    if (!peer || peer.audioEl) return;
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = stream;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    peer.audioEl = audio;
    console.log('[network] remote audio connected for', sessionId.slice(0, 8));
  }

  _spawnAvatar(sessionId, x, y, z, yaw) {
    if (this._avatars.has(sessionId)) return;
    const world = this.world;
    if (!world?.scene) return;
    const mesh = createAvatarMesh(sessionId);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw || 0;
    world.scene.add(mesh);
    this._avatars.set(sessionId, { mesh, targetX: x, targetY: y, targetZ: z, targetYaw: yaw || 0 });
    console.log('[network] peer spawned:', sessionId);
  }

  destroy() {
    this._disconnect();
  }
};
