import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { getState, subscribe } from "@/lib/progress-store";

/** Set of "bookId:unitId" strings for completed units. */
export function useCompletedUnits(): Set<string> {
  const hydrated = useHydrated();
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  if (!hydrated) return new Set();
  const s = getState();
  const done = new Set<string>();
  for (const [key, up] of Object.entries(s.units)) {
    if (up?.completed) done.add(key);
  }
  // tick reference so lint is happy
  void tick;
  return done;
}
