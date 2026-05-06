/**
 * WebRTC DataChannels Manager for AR Portal
 * Enables shared AR sessions — multiple devices see the same placed content.
 *
 * Primary use: Fiesta theme — host places gift, guests see it at the same position.
 *
 * Signaling: Uses a Cloudflare Durable Object (or simple WebSocket relay).
 * For Phase 1, supports direct connection via offer/answer exchange.
 *
 * Usage:
 *   const manager = createWebRTCManager({ roomId, role: 'host' | 'guest' });
 *   await manager.connect();
 *   manager.onAnchor(anchorData => { ... });
 *   manager.broadcastAnchor(anchorData);
 */

import { browser } from '$app/environment';

/**
 * @param {Object} opts
 * @param {string} opts.roomId - Unique room identifier
 * @param {'host'|'guest'} opts.role - Host creates offer, guest answers
 * @param {string} [opts.signalUrl] - Signaling server URL (Durable Object endpoint)
 * @param {Function} [opts.onAnchor] - Called when anchor data received from peer
 * @param {Function} [opts.onPeerJoined] - Called when a peer connects
 * @param {Function} [opts.onPeerLeft] - Called when a peer disconnects
 */
export function createWebRTCManager({
  roomId,
  role = 'guest',
  signalUrl = '/api/ar/signal',
  onAnchor,
  onPeerJoined,
  onPeerLeft,
}) {
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  let pc = null;
  let channel = null;
  let signalWS = null;
  let connected = false;
  let peerConnected = false;

  /**
   * Create the RTCPeerConnection and DataChannel
   */
  function createPeer() {
    pc = new RTCPeerConnection(RTC_CONFIG);

    // Host creates the data channel
    if (role === 'host') {
      channel = pc.createDataChannel('ar-anchor', {
        ordered: true,
        maxRetransmits: 3,
      });
      setupChannel(channel);
    }

    // Guest receives the data channel
    pc.ondatachannel = (event) => {
      channel = event.channel;
      setupChannel(channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        peerConnected = true;
        connected = true;
        onPeerJoined?.();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        peerConnected = false;
        onPeerLeft?.();
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalWS) {
        signalWS.send(JSON.stringify({
          type: 'ice-candidate',
          roomId,
          candidate: event.candidate,
        }));
      }
    };
  }

  /**
   * Set up message handler on the DataChannel
   */
  function setupChannel(ch) {
    ch.onopen = () => {
      console.log('[WebRTC] DataChannel open');
    };

    ch.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'anchor') {
          // Anchor placement data from host
          onAnchor?.(data.payload);
        } else if (data.type === 'transform') {
          // Real-time transform updates (drag/scale/rotate)
          onAnchor?.(data.payload);
        }
      } catch (e) {
        console.warn('[WebRTC] Failed to parse message:', e);
      }
    };

    ch.onclose = () => {
      peerConnected = false;
      onPeerLeft?.();
    };
  }

  /**
   * Connect to signaling server and establish peer connection
   */
  async function connect() {
    if (!browser) return;

    createPeer();

    // Connect to signaling server
    signalWS = new WebSocket(signalUrl);

    await new Promise((resolve, reject) => {
      signalWS.onopen = resolve;
      signalWS.onerror = reject;
      setTimeout(reject, 10000); // 10s timeout
    });

    // Join room
    signalWS.send(JSON.stringify({ type: 'join', roomId, role }));

    // Handle signaling messages
    signalWS.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'offer':
          if (role === 'guest') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signalWS.send(JSON.stringify({
              type: 'answer',
              roomId,
              answer: pc.localDescription,
            }));
          }
          break;

        case 'answer':
          if (role === 'host') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          }
          break;

        case 'ice-candidate':
          if (msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
          break;

        case 'peer-joined':
          // A peer joined the room
          onPeerJoined?.();
          break;

        case 'peer-left':
          onPeerLeft?.();
          break;
      }
    };
  }

  /**
   * Broadcast anchor placement data to all peers
   * @param {Object} payload - { position: {x,y,z}, quaternion: {x,y,z,w}, scale: {x,y,z} }
   */
  function broadcastAnchor(payload) {
    if (!channel || channel.readyState !== 'open') return;

    channel.send(JSON.stringify({
      type: 'anchor',
      payload,
    }));
  }

  /**
   * Broadcast real-time transform updates (during gestures)
   * @param {Object} payload - Same shape as broadcastAnchor
   */
  function broadcastTransform(payload) {
    if (!channel || channel.readyState !== 'open') return;

    channel.send(JSON.stringify({
      type: 'transform',
      payload,
    }));
  }

  /**
   * Clean up all connections
   */
  function disconnect() {
    if (signalWS) {
      signalWS.send(JSON.stringify({ type: 'leave', roomId }));
      signalWS.close();
      signalWS = null;
    }
    if (channel) {
      channel.close();
      channel = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
    connected = false;
    peerConnected = false;
  }

  return {
    get connected() { return connected; },
    get peerConnected() { return peerConnected; },
    connect,
    broadcastAnchor,
    broadcastTransform,
    disconnect,
  };
}
