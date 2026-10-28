/**
 * StudyLoop State Store: LocalStorage + Background Firebase RTDB Cloud Sync
 *
 * Rules:
 * - Offline-first: Reads and writes localStorage immediately for zero latency.
 * - Cloud Persistence: Syncs state in background to server /api/sync endpoint.
 * - No secrets or database URLs exposed in client bundles.
 */

const STORAGE_KEY = 'studyloop_session_v1';
let syncTimeoutId = null;

export function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[StudyLoop Store] Could not read localStorage:', err);
    return null;
  }
}

export function saveStoredState(state) {
  // 1. Instant local persistence
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[StudyLoop Store] Could not write to localStorage:', err);
  }

  // 2. Debounced background cloud sync to Firebase RTDB via proxy
  if (syncTimeoutId) clearTimeout(syncTimeoutId);
  syncTimeoutId = setTimeout(() => {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    }).catch((err) => {
      // Non-blocking background sync warning
      console.warn('[StudyLoop Cloud Sync] Background sync to Firebase deferred:', err.message);
    });
  }, 1000);
}

export async function fetchCloudState() {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.state || null;
  } catch (err) {
    console.warn('[StudyLoop Cloud Sync] Could not fetch remote state:', err.message);
    return null;
  }
}

export function clearStoredState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[StudyLoop Store] Could not clear localStorage:', err);
  }
}
