import { describe, expect, it } from "vitest";

// Minimal localStorage so progress-store runs under node.
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};
Object.assign(globalThis, {
  window: { localStorage: storage, addEventListener() {} },
  localStorage: storage,
});

describe("undoSrsRating", () => {
  it("restores the item and today's counts", async () => {
    const { getSrsItem, rateSrsItem, undoSrsRating, getStudyDay } =
      await import("./progress-store");
    // New card: undo removes it and the "fresh" count.
    rateSrsItem("kana", "あ", "good");
    undoSrsRating("kana", "あ", undefined);
    expect(getSrsItem("kana", "あ")).toBeUndefined();
    expect(getStudyDay().counts.kana?.fresh).toBe(0);
    // Known card: undo puts back the previous schedule and the "reviews" count.
    rateSrsItem("kana", "い", "good");
    const prev = getSrsItem("kana", "い");
    rateSrsItem("kana", "い", "again");
    undoSrsRating("kana", "い", prev);
    expect(getSrsItem("kana", "い")).toEqual(prev);
    expect(getStudyDay().counts.kana).toEqual({ fresh: 1, reviews: 0 });
  });
});
