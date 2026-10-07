/**
 * Local-only fault log: user-flagged content mistakes.
 * Stored as one growing array in localStorage, alongside progress-store data.
 */
import { saveJsonFile } from "./backup";

export const FAULT_LOG_KEY = "zerokara.faultlog.v1";

export type FaultReport = {
  id: string;
  timestamp: string;
  book_id: string;
  book_title: string;
  unit_id: string;
  unit_label: string;
  unit_title: string;
  section_type: string;
  item_type: string;
  item_id: string;
  item_snapshot: unknown;
  user_comment: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeFaultLog(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((l) => l());
}

export function getFaultLog(): FaultReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAULT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FaultReport[]) : [];
  } catch {
    return [];
  }
}

/** Oldest reports are dropped beyond this, so the log can't fill up storage. */
const MAX_REPORTS = 300;

function write(entries: FaultReport[]): boolean {
  let ok = true;
  try {
    window.localStorage.setItem(FAULT_LOG_KEY, JSON.stringify(entries.slice(-MAX_REPORTS)));
  } catch {
    ok = false;
  }
  emit();
  return ok;
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns the saved report, or null if storage was full and it couldn't be saved. */
export function addFaultReport(entry: Omit<FaultReport, "id" | "timestamp">): FaultReport | null {
  const full: FaultReport = {
    ...entry,
    id: newId(),
    timestamp: new Date().toISOString(),
  };
  return write([...getFaultLog(), full]) ? full : null;
}

export function clearFaultLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FAULT_LOG_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export async function downloadFaultLog(): Promise<void> {
  if (typeof window === "undefined") return;
  const filename = `fault-log-${new Date().toISOString().slice(0, 10)}.json`;
  await saveJsonFile(filename, JSON.stringify(getFaultLog(), null, 2), "Save fault log");
}
