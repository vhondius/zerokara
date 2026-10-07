import { books, orderedUnits } from "@/content/registry";
import type { VocabWord } from "@/content/schema";

export type VocabEntry = VocabWord & {
  theme: string;
  bookId: string;
  bookTitle: string;
  unitId: string;
  unitLabel: string;
  unitTitle: string;
};

/** Every vocabulary word taught across every book, in course order. */
export function allVocabulary(): VocabEntry[] {
  const seen = new Set<string>();
  const out: VocabEntry[] = [];
  for (const book of books) {
    for (const unit of orderedUnits(book)) {
      for (const s of unit.sections) {
        if (s.type !== "vocabulary_groups") continue;
        for (const g of s.data.groups) {
          for (const w of g.words) {
            const key = `${w.kana}|${w.english}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
              ...w,
              theme: g.theme,
              bookId: book.id,
              bookTitle: book.title,
              unitId: unit.id,
              unitLabel: unit.label,
              unitTitle: unit.title,
            });
          }
        }
      }
    }
  }
  return out;
}

/** Stable id for a word (vocabulary entries have no id field of their own). */
export const vocabId = (w: { kana: string; english: string }) => `${w.kana}|${w.english}`;

/**
 * The separate meanings inside a gloss: "foot; leg" → ["foot", "leg"],
 * "shoe(s)" → ["shoe", "shoes"], "to close; to shut" → both.
 */
export function glossAlternatives(english: string): string[] {
  const out = new Set<string>();
  for (const part of english.split(/[;,/]/)) {
    const p = part.trim();
    if (!p) continue;
    const plural = p.replace(/\((\w{1,3})\)/g, "$1").trim(); // shoe(s) → shoes
    const bare = p
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim(); // shoe(s) → shoe
    if (plural) out.add(plural);
    if (bare) out.add(bare);
  }
  return [...out];
}

let byGloss: Map<string, VocabEntry[]> | null = null;
const glossKey = (english: string) => english.trim().toLowerCase();

/**
 * Accepted answers for a vocab quiz question. Japanese → English accepts only
 * the meaning (a romaji reading isn't a translation). English → Japanese
 * accepts every word sharing the same English prompt (開く and 開ける are both
 * "to open"), in kana, kanji or romaji.
 */
export function vocabAnswers(word: VocabEntry, direction: "jp-to-en" | "en-to-jp"): string[] {
  if (direction === "jp-to-en") return glossAlternatives(word.english);
  if (!byGloss) {
    byGloss = new Map();
    for (const w of allVocabulary()) {
      const k = glossKey(w.english);
      byGloss.set(k, [...(byGloss.get(k) ?? []), w]);
    }
  }
  const same = byGloss.get(glossKey(word.english)) ?? [word];
  return [...new Set(same.flatMap((w) => [w.kana, w.kanji ?? "", w.romaji]).filter(Boolean))];
}
