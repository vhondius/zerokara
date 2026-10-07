import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTheme, type StudySettings } from "@/components/theme/ThemeProvider";
import {
  getState,
  getStudyDay,
  subscribe,
  type SrsItem,
  type SrsItemType,
} from "@/lib/progress-store";

export type ReviewSession<T> = {
  /** The cards for one session: due reviews first, then new cards, capped at the session size. */
  cards: T[];
  /** Known cards due now (before the daily cap). */
  due: number;
  /** Cards never reviewed yet (before the daily cap). */
  fresh: number;
};

/** Never-reviewed cards: no row yet, or a row seeded when its unit was completed. */
const isFresh = (row: SrsItem | undefined) => !row || !row.last_reviewed_at;

/**
 * Builds today's review session for a deck, honouring the daily limits in
 * Settings → Study: at most `newPerDay` first-time cards and `reviewsPerDay`
 * reviews per deck per day, and at most `sessionSize` cards per session.
 */
export function buildReviewSession<T>(
  pool: T[],
  itemType: SrsItemType,
  idOf: (item: T) => string,
  study: StudySettings,
  now: Date = new Date(),
): ReviewSession<T> {
  const srs = getState().srs;
  const done = getStudyDay().counts[itemType] ?? { reviews: 0, fresh: 0 };
  const due: T[] = [];
  const fresh: T[] = [];
  for (const item of pool) {
    const row = srs[`${itemType}:${idOf(item)}`];
    if (isFresh(row)) fresh.push(item);
    else if (new Date(row!.due_at) <= now) due.push(item);
  }
  const cards = [
    ...due.slice(0, Math.max(0, study.reviewsPerDay - done.reviews)),
    ...fresh.slice(0, Math.max(0, study.newPerDay - done.fresh)),
  ].slice(0, study.sessionSize);
  return { cards, due: due.length, fresh: fresh.length };
}

/** Today's review session for a deck, recomputed as progress changes. */
export function useReviewSession<T>(
  pool: T[],
  itemType: SrsItemType,
  idOf: (item: T) => string,
): ReviewSession<T> {
  const hydrated = useHydrated();
  const { study } = useTheme();
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  if (!hydrated) return { cards: [], due: 0, fresh: 0 };
  return buildReviewSession(pool, itemType, idOf, study);
}

/** Number of cards in today's review session for a kana/kanji deck. */
export function useDueCount(pool: { char: string }[], itemType: SrsItemType): number {
  return useReviewSession(pool, itemType, (k) => k.char).cards.length;
}
