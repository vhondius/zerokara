import { useEffect, useState } from "react";

/** True on touch-first devices (phones, tablets), so hints can say "tap" instead of naming keys. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    if (!mq) return;
    setCoarse(mq.matches);
    const onChange = () => setCoarse(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return coarse;
}
