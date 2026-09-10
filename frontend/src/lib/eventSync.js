// Real-time cross-device and cross-tab state synchronization for FTS Event Poll
import api from '../services/api';

const STORAGE_KEY = 'fts_event_state_v2';
const LEGACY_STORAGE_KEY = 'fts_event_state_v1';
const CHANNEL_NAME = 'fts_event_sync_channel';

// 1. Cross-Tab Local Sync via BroadcastChannel
let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  channel = null;
}

export function saveStateToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save event state to localStorage:', e);
  }
}

export function loadStateFromStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to load event state from localStorage:', e);
    return null;
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear event state from localStorage:', e);
  }
}

export function broadcastStateChange(action, payload) {
  if (channel) {
    try {
      channel.postMessage({ action, payload, timestamp: Date.now() });
    } catch (e) {
      console.warn('Broadcast error:', e);
    }
  }
}

const listeners = new Set();
const statusListeners = new Set();
let connectionStatus = 'offline'; // 'live' | 'reconnecting' | 'offline'

export function subscribeToBroadcast(callback) {
  listeners.add(callback);

  // BroadcastChannel local cross-tab message handler
  const bcHandler = (event) => {
    if (event.data) {
      callback(event.data);
    }
  };
  if (channel) {
    channel.addEventListener('message', bcHandler);
  }

  return () => {
    listeners.delete(callback);
    if (channel) {
      channel.removeEventListener('message', bcHandler);
    }
  };
}

export function subscribeToConnectionStatus(callback) {
  statusListeners.add(callback);
  callback(connectionStatus);
  return () => {
    statusListeners.delete(callback);
  };
}

function updateConnectionStatus(status) {
  connectionStatus = status;
  for (const cb of statusListeners) {
    try {
      cb(status);
    } catch {}
  }
}

// 2. Authoritative Server-Sent Events (SSE) Cross-Device Sync
let eventSource = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

export function initRealtimeEventSync() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return () => {};

  const streamUrl = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/live/stream`
    : '/api/live/stream';

  function connect() {
    if (eventSource) {
      eventSource.close();
    }

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        updateConnectionStatus('live');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.type === 'ACTION' || data.type === 'INIT_STATE')) {
            const state = data.state;
            if (state) {
              saveStateToStorage(state);
            }
            for (const cb of listeners) {
              cb({
                action: 'STATE_UPDATE',
                payload: state,
                source: 'server',
                timestamp: data.timestamp
              });
            }
          }
        } catch (err) {
          console.warn('[RealtimeSync] Error parsing incoming SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        updateConnectionStatus('reconnecting');
        eventSource.close();
        eventSource = null;

        // Exponential backoff with randomized jitter (0-2000ms) to prevent 4,000-client thundering herd
        const baseDelay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 12000);
        const jitter = Math.floor(Math.random() * 2000);
        const delay = baseDelay + jitter;
        reconnectAttempts++;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, delay);
      };
    } catch (err) {
      console.warn('[RealtimeSync] Failed to initialize EventSource:', err);
      updateConnectionStatus('offline');
    }
  }

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    updateConnectionStatus('offline');
  };
}

/**
 * Fetch Authoritative State Snapshot from Server
 */
export async function fetchAuthoritativeState() {
  try {
    const res = await api.get('/live/state');
    if (res?.data?.state) {
      saveStateToStorage(res.data.state);
      return res.data.state;
    }
    return res?.state || null;
  } catch (err) {
    console.warn('[RealtimeSync] Fallback to local storage (server offline):', err.message);
    return loadStateFromStorage();
  }
}

/**
 * Dispatch an action to the server and broadcast to all devices
 */
export async function syncActionToServer(action, payload = {}) {
  try {
    const res = await api.post('/live/action', { action, payload });
    return res;
  } catch (err) {
    console.warn('[RealtimeSync] Server action rejected or offline:', err.message);
    // Optimistic fallback to local broadcast
    broadcastStateChange('STATE_UPDATE', payload);
    return { ok: false, error: err.message };
  }
}
