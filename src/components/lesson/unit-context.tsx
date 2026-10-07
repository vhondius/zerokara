import { createContext, useContext } from "react";
import type { Unit } from "@/content/schema";

type Ctx = {
  bookId: string;
  unit: Unit;
  allExerciseIds: string[];
};

const UnitContext = createContext<Ctx | null>(null);

export const UnitProvider = UnitContext.Provider;

export function useUnitContext(): Ctx {
  const c = useContext(UnitContext);
  if (!c) throw new Error("useUnitContext must be used inside <UnitProvider>");
  return c;
}

/** Same as useUnitContext, but returns null instead of throwing outside a <UnitProvider>. */
export function useUnitContextOptional(): Ctx | null {
  return useContext(UnitContext);
}
