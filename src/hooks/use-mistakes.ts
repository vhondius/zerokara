import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { getState, subscribe, type MistakeItemType } from "@/lib/progress-store";

/** Filter a pool down to items currently tracked as mistakes. */
export function useMistakeItems<T>(
  pool: T[],
  itemType: MistakeItemType,
  idOf: (item: T) => string,
): T[] {
  const hydrated = useHydrated();
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  if (!hydrated) return [];
  const mistakes = getState().mistakes;
  return pool.filter((entry) => `${itemType}:${idOf(entry)}` in mistakes);
}

/** Count of items in the pool currently tracked as mistakes. */
export function useMistakeCount<T>(
  pool: T[],
  itemType: MistakeItemType,
  idOf: (item: T) => string,
): number {
  return useMistakeItems(pool, itemType, idOf).length;
}
