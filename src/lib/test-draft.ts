import type { ExerciseResult } from "@/lib/progress-store";

/**
 * An unfinished book-test attempt, saved after every answer so a reload,
 * back swipe or Android killing the app resumes it instead of losing it.
 * Only finishing the test or confirming "Leave the test?" clears it.
 */
export type TestDraft = {
  /** `${unitId}::${exerciseId}` for each sampled question, in order. */
  keys: string[];
  results: Record<string, ExerciseResult>;
  index: number;
};

const key = (bookId: string) => `zerokara.test-draft.${bookId}`;

export function loadTestDraft(bookId: string): TestDraft | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key(bookId));
    if (!raw) return undefined;
    const d = JSON.parse(raw) as TestDraft;
    if (!Array.isArray(d.keys) || typeof d.index !== "number" || typeof d.results !== "object")
      return undefined;
    return { keys: d.keys, results: d.results ?? {}, index: d.index };
  } catch {
    return undefined;
  }
}

export function saveTestDraft(bookId: string, draft: TestDraft) {
  try {
    window.localStorage.setItem(key(bookId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the attempt still works, it just can't resume.
  }
}

export function clearTestDraft(bookId: string) {
  try {
    window.localStorage.removeItem(key(bookId));
  } catch {
    // ignore
  }
}
