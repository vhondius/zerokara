import { toast } from "sonner";
import { markDay } from "@/lib/study-plan";

/**
 * Anonymous, local-only progress. Never read at module scope — always inside
 * useEffect / a useHydrated() gate to avoid SSR hydration mismatches.
 */

const KEY = "zerokara.progress.v1";
/** ISO date (YYYY-MM-DD) of the last lesson/practice activity. */
export const ACTIVITY_KEY = "zerokara.activity.v1";

/** Today's date in the learner's own timezone, as YYYY-MM-DD. */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const today = () => localDate();

/** Record that the learner did something today (lesson or practice). */
export function markActivity() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVITY_KEY, today());
  } catch {
    /* ignore */
  }
}

export function getLastActivityDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVITY_KEY);
  } catch {
    return null;
  }
}

export function didStudyToday(): boolean {
  return getLastActivityDate() === today();
}

export type ExerciseStatus = "correct" | "incorrect" | "self-correct" | "self-incorrect" | "done";

export type ExerciseResult = {
  answer: string;
  status: ExerciseStatus;
  at: string;
};

export type UnitProgress = {
  completed: boolean;
  completed_at?: string;
  exercise_results?: Record<string, ExerciseResult>;
  /** @deprecated kept for backwards compatibility with earlier data */
  exercise_answers?: Record<string, string>;
};

export type SrsItemType = "kana" | "kanji" | "vocabulary";

export type SrsRating = "again" | "hard" | "good" | "easy";

export type SrsItem = {
  id: string; // `${item_type}:${item_id}`
  item_type: SrsItemType;
  item_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: string;
  last_reviewed_at?: string;
};

export type MistakeItemType = "kana" | "kanji" | "vocabulary";

export type MistakeItem = {
  id: string; // `${item_type}:${item_id}`
  item_type: MistakeItemType;
  item_id: string;
  wrong_count: number;
  /** Cumulative correct answers since the first miss — not required to be consecutive. */
  correct_count: number;
  last_seen_at: string;
};

export type BookTestResult = {
  passed: boolean;
  score: number;
  completed_at: string;
};

export type ProgressState = {
  units: Record<string, UnitProgress>;
  srs: Record<string, SrsItem>;
  mistakes: Record<string, MistakeItem>;
  book_tests: Record<string, BookTestResult>;
};

const empty = (): ProgressState => ({ units: {}, srs: {}, mistakes: {}, book_tests: {} });

/* ---------- change notification ---------- */

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
function notify() {
  listeners.forEach((l) => l());
}

/* ---------- read/write ---------- */

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Coerces stored data into a usable shape: a top-level part that isn't an
 * object (e.g. `units: null` after an interrupted write) becomes empty
 * instead of crashing every page that reads it, null rows are dropped, and
 * an unreadable review date is treated as due now.
 */
function sanitize(raw: unknown): ProgressState {
  const state = empty();
  if (!isObject(raw)) return state;
  for (const part of ["units", "srs", "mistakes", "book_tests"] as const) {
    const value = raw[part];
    if (!isObject(value)) continue;
    const clean: Record<string, unknown> = {};
    for (const [k, row] of Object.entries(value)) if (isObject(row)) clean[k] = row;
    (state as Record<string, unknown>)[part] = clean;
  }
  for (const item of Object.values(state.srs)) {
    if (Number.isNaN(Date.parse(item.due_at))) item.due_at = new Date().toISOString();
  }
  return state;
}

/*
 * Parsed state is kept in memory: every exercise on a page reads progress,
 * and re-parsing the whole blob each time made answering slow once a lot of
 * progress had built up. Another tab or window writing it invalidates the copy.
 */
let cache: ProgressState | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) {
      cache = null;
      notify();
    }
  });
}

/** The current state, shared — never mutate it. */
function load(): ProgressState {
  if (typeof window === "undefined") return empty();
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? sanitize(JSON.parse(raw)) : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

/** A private copy for a mutator to change and pass to write(). */
function read(): ProgressState {
  return structuredClone(load());
}

/** Saves the state. Returns false (and tells the learner) if storage is full. */
function write(state: ProgressState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast.error("Your phone's storage for this app is full, so this wasn't saved.", {
      description: "Clearing the fault log in Settings frees up space.",
    });
    return false;
  }
  cache = state;
  markActivity();
  notify();
  return true;
}

const unitKey = (bookId: string, unitId: string) => `${bookId}:${unitId}`;

export function getState(): ProgressState {
  return load();
}

export function getUnitProgress(bookId: string, unitId: string): UnitProgress | undefined {
  return load().units[unitKey(bookId, unitId)];
}

export function setUnitComplete(bookId: string, unitId: string, completed = true) {
  const s = read();
  const key = unitKey(bookId, unitId);
  s.units[key] = {
    ...(s.units[key] ?? { completed: false }),
    completed,
    completed_at: completed ? new Date().toISOString() : undefined,
  };
  write(s);
}

export function recordExerciseResult(
  bookId: string,
  unitId: string,
  exerciseId: string,
  result: ExerciseResult,
) {
  const s = read();
  const key = unitKey(bookId, unitId);
  const current = s.units[key] ?? { completed: false };
  s.units[key] = {
    ...current,
    exercise_results: {
      ...(current.exercise_results ?? {}),
      [exerciseId]: result,
    },
  };
  if (write(s)) markDay("lesson");
}

export function getBookTestResult(bookId: string): BookTestResult | undefined {
  return load().book_tests[bookId];
}

export function isBookTestPassed(bookId: string): boolean {
  return !!getBookTestResult(bookId)?.passed;
}

/** A later failed retake never re-locks a book already unlocked. */
export function setBookTestResult(bookId: string, passed: boolean, score: number) {
  const s = read();
  const current = s.book_tests[bookId];
  s.book_tests[bookId] = {
    passed: passed || !!current?.passed,
    score,
    completed_at: new Date().toISOString(),
  };
  write(s);
}

export function getSrsQueue(now = new Date()): SrsItem[] {
  const s = load();
  return Object.values(s.srs).filter((i) => new Date(i.due_at) <= now);
}

export function getSrsItem(itemType: SrsItemType, itemId: string): SrsItem | undefined {
  return load().srs[`${itemType}:${itemId}`];
}

export function upsertSrsItem(item: SrsItem) {
  const s = read();
  s.srs[item.id] = item;
  write(s);
}

/**
 * Create an SRS item at defaults (due now) only if one does not already
 * exist for this user + character. Never overwrites existing SRS progress.
 * Returns true if a new row was created.
 */
export function ensureSrsItem(itemType: SrsItemType, itemId: string, now = new Date()): boolean {
  const id = `${itemType}:${itemId}`;
  if (load().srs[id]) return false;
  const s = read();
  s.srs[id] = {
    id,
    item_type: itemType,
    item_id: itemId,
    ease: 2.5,
    interval_days: 0,
    reps: 0,
    due_at: now.toISOString(),
  };
  write(s);
  return true;
}

const EASE_FLOOR = 1.3;

/** Simplified SM-2. Returns the updated item. */
export function rateSrsItem(
  itemType: SrsItemType,
  itemId: string,
  rating: SrsRating,
  now = new Date(),
): SrsItem {
  const id = `${itemType}:${itemId}`;
  const s = read();
  const prev: SrsItem = s.srs[id] ?? {
    id,
    item_type: itemType,
    item_id: itemId,
    ease: 2.5,
    interval_days: 0,
    reps: 0,
    due_at: now.toISOString(),
  };

  let { ease, interval_days: interval, reps } = prev;

  switch (rating) {
    case "again":
      reps = 0;
      interval = 1;
      ease = Math.max(EASE_FLOOR, ease - 0.2);
      break;
    case "hard":
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(EASE_FLOOR, ease - 0.15);
      reps += 1;
      break;
    case "good":
      if (reps === 0) interval = 1;
      else if (reps === 1) interval = 6;
      // Always at least a day longer, so a low ease can't pin a card at 1 day.
      else interval = Math.max(interval + 1, Math.round(interval * ease));
      reps += 1;
      break;
    case "easy":
      // A card known instantly the first time skips ahead to 4 days.
      if (reps === 0) interval = 4;
      else if (reps === 1) interval = 6;
      else interval = Math.max(interval + 1, Math.round(interval * ease * 1.3));
      ease = Math.max(EASE_FLOOR, ease + 0.15);
      reps += 1;
      break;
  }

  const next: SrsItem = {
    ...prev,
    ease,
    interval_days: interval,
    reps,
    due_at: new Date(now.getTime() + interval * 86400_000).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
  s.srs[id] = next;
  if (write(s)) markDay("review");
  countReview(itemType, !prev.last_reviewed_at);
  return next;
}

/** A quiz miss brings an already-scheduled item back into review right away. */
export function markSrsDueNow(itemType: SrsItemType, itemId: string, now = new Date()) {
  const id = `${itemType}:${itemId}`;
  if (!load().srs[id]) return;
  const s = read();
  s.srs[id] = { ...s.srs[id], due_at: now.toISOString() };
  write(s);
}

/* ---------- today's review counts (for the daily limits) ---------- */

const STUDY_DAY_KEY = "zerokara.studyday.v1";

export type StudyDay = {
  date: string;
  /** Per item type: reviews of known cards, and cards seen for the first time. */
  counts: Partial<Record<SrsItemType, { reviews: number; fresh: number }>>;
};

export function getStudyDay(): StudyDay {
  const blank: StudyDay = { date: localDate(), counts: {} };
  if (typeof window === "undefined") return blank;
  try {
    const d = JSON.parse(window.localStorage.getItem(STUDY_DAY_KEY) ?? "null") as StudyDay | null;
    return d && d.date === blank.date && isObject(d.counts) ? d : blank;
  } catch {
    return blank;
  }
}

function countReview(itemType: SrsItemType, firstTime: boolean) {
  const day = getStudyDay();
  const c = day.counts[itemType] ?? { reviews: 0, fresh: 0 };
  day.counts[itemType] = firstTime
    ? { ...c, fresh: c.fresh + 1 }
    : { ...c, reviews: c.reviews + 1 };
  try {
    window.localStorage.setItem(STUDY_DAY_KEY, JSON.stringify(day));
  } catch {
    /* the limits just won't count this one */
  }
}

const MISTAKE_MASTERY_COUNT = 3;

/** Record a wrong answer. Creates the row on first miss; never resets correct_count. */
export function recordMistake(itemType: MistakeItemType, itemId: string, now = new Date()) {
  const id = `${itemType}:${itemId}`;
  const s = read();
  const prev = s.mistakes[id];
  s.mistakes[id] = {
    id,
    item_type: itemType,
    item_id: itemId,
    wrong_count: (prev?.wrong_count ?? 0) + 1,
    correct_count: prev?.correct_count ?? 0,
    last_seen_at: now.toISOString(),
  };
  write(s);
}

/**
 * Record a correct answer for an item currently in the mistakes list. No-op
 * if the item isn't tracked as a mistake. Once correct_count reaches
 * MISTAKE_MASTERY_COUNT (cumulative, not necessarily consecutive), the item
 * is removed from the list entirely.
 */
export function recordMistakeCorrect(itemType: MistakeItemType, itemId: string, now = new Date()) {
  const id = `${itemType}:${itemId}`;
  const s = read();
  const prev = s.mistakes[id];
  if (!prev) return;
  const correct_count = prev.correct_count + 1;
  if (correct_count >= MISTAKE_MASTERY_COUNT) {
    delete s.mistakes[id];
  } else {
    s.mistakes[id] = { ...prev, correct_count, last_seen_at: now.toISOString() };
  }
  write(s);
}

export function getMistakeQueue(itemType?: MistakeItemType): MistakeItem[] {
  const s = load();
  const all = Object.values(s.mistakes);
  return itemType ? all.filter((m) => m.item_type === itemType) : all;
}

export function resetAll() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  cache = null;
  try {
    window.localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
  notify();
}
