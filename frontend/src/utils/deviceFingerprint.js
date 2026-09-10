/**
 * Client-Side Device & Browser Fingerprint Generator
 * Generates a stable, high-entropy device identifier combining:
 * 1. Persistent local storage UUID
 * 2. Canvas 2D drawing signature
 * 3. Screen resolution & color depth
 * 4. Hardware concurrency & platform
 * 5. Timezone offset
 */

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getCanvasSignature() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocanvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FTS-VOTE-2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('FTS-VOTE-2026', 4, 17);

    return simpleHash(canvas.toDataURL());
  } catch {
    return 'canvashash_err';
  }
}

export function getClientDeviceId() {
  const STORAGE_KEY = 'fts_device_uuid';
  let storedUuid = '';

  try {
    storedUuid = localStorage.getItem(STORAGE_KEY) || '';
    if (!storedUuid) {
      storedUuid = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(STORAGE_KEY, storedUuid);
    }
  } catch {
    // If localStorage is disabled (e.g. strict private mode), fallback to in-memory/window variable
    if (!window.__fts_dev_id) {
      window.__fts_dev_id = `dev_tmp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    }
    storedUuid = window.__fts_dev_id;
  }

  // Generate hardware & browser component signature
  const screenInfo = typeof window !== 'undefined' && window.screen 
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}` 
    : 'noscreen';
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const platform = nav.platform || 'noplatform';
  const concurrency = nav.hardwareConcurrency || 4;
  const timezone = new Date().getTimezoneOffset();
  const canvasHash = getCanvasSignature();

  const rawFingerprint = `${storedUuid}|${screenInfo}|${platform}|${concurrency}|${timezone}|${canvasHash}`;
  const computedHash = simpleHash(rawFingerprint);

  return `${storedUuid.substring(0, 16)}_${computedHash}`;
}

export default { getClientDeviceId };
