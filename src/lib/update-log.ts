/**
 * Tracks which changelog entry the user last saw the "what's new" popup for.
 * Deliberately separate from progress-store.ts so "Delete progress data"
 * doesn't also reset this.
 */

const KEY = "zerokara.lastSeenChangelogId.v1";

export function getLastSeenChangelogId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setLastSeenChangelogId(id: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(id));
  } catch {
    /* ignore quota errors */
  }
}
