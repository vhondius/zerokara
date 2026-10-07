import { useEffect, useState } from "react";

/** True after the first client render — safe gate for browser-only reads. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
