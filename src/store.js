/**
 * Simple LocalStorage state helper for StudyLoop.
 */

const STORAGE_KEY = 'studyloop_session_v1';

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[StudyLoop Store] Could not write to localStorage:', err);
  }
}

export function clearStoredState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[StudyLoop Store] Could not clear localStorage:', err);
  }
}
