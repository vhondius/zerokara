import { books, orderedUnits } from "@/content/registry";
import type { KanaCharacter, Unit } from "@/content/schema";

export type PracticeScript = "hiragana" | "katakana" | "kanji";

export type KanaEntry = KanaCharacter & {
  script: PracticeScript;
  bookId: string;
  unitId: string;
  unitLabel: string;
  unitTitle: string;
  unitOrderKey: string; // sortable within a book
};

const union = (a: string[] | undefined, b: string[] | undefined) => [
  ...new Set([...(a ?? []), ...(b ?? [])]),
];

function mergeInto(
  entry: KanaEntry,
  other: Pick<KanaCharacter, "onyomi" | "kunyomi" | "example_words">,
) {
  entry.onyomi = union(entry.onyomi, other.onyomi);
  entry.kunyomi = union(entry.kunyomi, other.kunyomi);
  const words = [...(entry.example_words ?? [])];
  for (const w of other.example_words ?? [])
    if (!words.some((x) => x.japanese === w.japanese)) words.push(w);
  entry.example_words = words;
}

function collect(script: PracticeScript): KanaEntry[] {
  const seen = new Map<string, KanaEntry>();
  for (const book of books) {
    const ordered = orderedUnits(book);
    ordered.forEach((unit: Unit, idx) => {
      for (const s of unit.sections) {
        if (s.type === "kana_intro" && s.data.script === script) {
          for (const c of s.data.characters) {
            const earlier = seen.get(c.char);
            if (earlier) {
              // A kanji taught again in a later book often lists readings or
              // example words the first introduction left out; keep them all.
              mergeInto(earlier, c);
              continue;
            }
            seen.set(c.char, {
              ...c,
              script,
              bookId: book.id,
              unitId: unit.id,
              unitLabel: unit.label,
              unitTitle: unit.title,
              unitOrderKey: String(idx).padStart(4, "0"),
            });
          }
        }
      }
    });
  }

  // kanji_entries can formally introduce a character in a unit even when the
  // unit's kana_intro section doesn't repeat it — fold those in too.
  if (script === "kanji") {
    for (const book of books) {
      const ordered = orderedUnits(book);
      for (const k of book.kanji_entries) {
        const earlier = seen.get(k.char);
        if (earlier) {
          mergeInto(earlier, { ...k, example_words: [] });
          continue;
        }
        const idx = ordered.findIndex((u) => u.id === k.introduced_in_unit);
        if (idx === -1) continue;
        const unit = ordered[idx];
        seen.set(k.char, {
          char: k.char,
          meaning: k.meaning,
          onyomi: k.onyomi,
          kunyomi: k.kunyomi,
          stroke_count: k.stroke_count,
          stroke_order_ref: k.stroke_order_ref,
          example_words: [],
          script,
          bookId: book.id,
          unitId: unit.id,
          unitLabel: unit.label,
          unitTitle: unit.title,
          unitOrderKey: String(idx).padStart(4, "0"),
        });
      }
    }
  }

  return [...seen.values()];
}

export function allHiragana(): KanaEntry[] {
  return collect("hiragana");
}

export function allKatakana(): KanaEntry[] {
  return collect("katakana");
}

export function allKanji(): KanaEntry[] {
  return collect("kanji");
}

/** Front-of-card answer text: romaji for kana, meaning for kanji. */
export function entryAnswer(entry: KanaEntry): string {
  return entry.romaji ?? entry.meaning ?? "";
}

/** Readings line for kanji cards, empty for kana. */
export function entryReadings(entry: KanaEntry): string {
  const on = entry.onyomi?.length ? `On ${entry.onyomi.join("、")}` : "";
  const kun = entry.kunyomi?.length ? `Kun ${entry.kunyomi.join("、")}` : "";
  return [on, kun].filter(Boolean).join(" · ");
}
