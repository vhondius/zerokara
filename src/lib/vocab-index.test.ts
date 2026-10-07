import { describe, expect, it } from "vitest";
import { allVocabulary, glossAlternatives, vocabAnswers } from "./vocab-index";
import { isLenientlyCorrect } from "./grading";

describe("vocab quiz answers (R12)", () => {
  it("splits glosses into meanings", () => {
    expect(glossAlternatives("foot; leg")).toEqual(["foot", "leg"]);
    expect(glossAlternatives("shoe(s)")).toEqual(expect.arrayContaining(["shoe", "shoes"]));
  });

  const word = (kana: string) => allVocabulary().find((w) => w.kana === kana)!;

  it("doesn't accept the romaji reading as the meaning", () => {
    const w = word("すずしい");
    expect(vocabAnswers(w, "jp-to-en").some((a) => isLenientlyCorrect("suzushii", a))).toBe(false);
    expect(vocabAnswers(w, "jp-to-en").some((a) => isLenientlyCorrect(w.english, a))).toBe(true);
  });

  it("accepts every word that shares the English prompt", () => {
    const opens = allVocabulary().filter((w) => w.english === "to open");
    expect(opens.length).toBeGreaterThan(1);
    const accepted = vocabAnswers(opens[0], "en-to-jp");
    for (const w of opens) expect(accepted.some((a) => isLenientlyCorrect(w.kana, a))).toBe(true);
  });
});
