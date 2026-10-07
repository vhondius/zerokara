import { useCallback, useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnitContext } from "@/components/lesson/unit-context";
import {
  ensureSrsItem,
  getUnitProgress,
  recordExerciseResult,
  setUnitComplete,
  subscribe,
  type ExerciseResult,
  type ExerciseStatus,
} from "@/lib/progress-store";
import type { Unit } from "@/content/schema";

function seedSrsForUnit(unit: Unit) {
  for (const s of unit.sections) {
    if (s.type !== "kana_intro") continue;
    const itemType = s.data.script === "kanji" ? "kanji" : "kana";
    for (const c of s.data.characters) {
      ensureSrsItem(itemType, c.char);
    }
  }
}

export function useUnitProgress() {
  const { bookId, unit, allExerciseIds } = useUnitContext();
  const hydrated = useHydrated();
  const [, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const up = hydrated ? getUnitProgress(bookId, unit.id) : undefined;
  const results: Record<string, ExerciseResult> = up?.exercise_results ?? {};
  const completed = !!up?.completed;

  const record = useCallback(
    (exerciseId: string, answer: string, status: ExerciseStatus) => {
      recordExerciseResult(bookId, unit.id, exerciseId, {
        answer,
        status,
        at: new Date().toISOString(),
      });
      // Auto-complete when every activity in the unit has been attempted.
      if (allExerciseIds.length > 0) {
        const latest = getUnitProgress(bookId, unit.id)?.exercise_results ?? {};
        const allAttempted = allExerciseIds.every((id) => latest[id]);
        const wasCompleted = !!getUnitProgress(bookId, unit.id)?.completed;
        if (allAttempted) {
          setUnitComplete(bookId, unit.id, true);
          if (!wasCompleted) seedSrsForUnit(unit);
        }
      }
    },
    [bookId, unit, allExerciseIds],
  );

  // Units without exercises (pure reading) can't auto-complete, so the
  // learner marks them read; without this they'd block the book test.
  const markRead = useCallback(() => {
    const wasCompleted = !!getUnitProgress(bookId, unit.id)?.completed;
    if (wasCompleted) return;
    setUnitComplete(bookId, unit.id, true);
    seedSrsForUnit(unit);
  }, [bookId, unit]);

  return { hydrated, results, completed, record, markRead };
}

/** Reactive helper for outside-of-unit code (e.g. dashboards). */
export function useProgressTick() {
  const hydrated = useHydrated();
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  return { hydrated, tick };
}
