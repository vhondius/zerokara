import type { Book, KanaCharacter, Unit } from "./schema";
import { jfz1 } from "./books/jfz-1";
import { jfz2 } from "./books/jfz-2";
import { jfz3 } from "./books/jfz-3";
import { jfz4 } from "./books/jfz-4";
import { jfz5 } from "./books/jfz-5";

export const books: Book[] = [jfz1, jfz2, jfz3, jfz4, jfz5];

export function getBook(bookId: string): Book | undefined {
  return books.find((b) => b.id === bookId);
}

export function getUnit(bookId: string, unitId: string): Unit | undefined {
  return getBook(bookId)?.units.find((u) => u.id === unitId);
}

/** The book studied immediately before this one, or `undefined` for the first book. */
export function previousBook(bookId: string): Book | undefined {
  const idx = books.findIndex((b) => b.id === bookId);
  return idx > 0 ? books[idx - 1] : undefined;
}

/**
 * Units in canonical study order.
 *
 * `pre-lesson` units come first (sorted by order_index), followed by a single
 * continuous sequence of `lesson` and `kanji-lesson` units interleaved by
 * order_index. Book 3 genuinely alternates Kanji Lesson N → Lesson N, so
 * kanji-lessons are part of the main linear path, not a separate track.
 */
export function orderedUnits(book: Book): Unit[] {
  const preLessons = book.units
    .filter((u) => u.type === "pre-lesson")
    .sort((a, b) => a.order_index - b.order_index);
  const mainPath = book.units
    .filter((u) => u.type === "lesson" || u.type === "kanji-lesson")
    .sort((a, b) => a.order_index - b.order_index);
  return [...preLessons, ...mainPath];
}

/** Every kana character introduced in any unit up to (and including) unitId. */
export function getKanaIntroducedUpTo(bookId: string, unitId: string): KanaCharacter[] {
  const book = getBook(bookId);
  if (!book) return [];
  const chain = orderedUnits(book);
  const idx = chain.findIndex((u) => u.id === unitId);
  const scope = idx === -1 ? chain : chain.slice(0, idx + 1);
  const seen = new Map<string, KanaCharacter>();
  for (const u of scope) {
    for (const s of u.sections) {
      if (s.type === "kana_intro") {
        for (const c of s.data.characters) if (!seen.has(c.char)) seen.set(c.char, c);
      }
    }
  }
  return [...seen.values()];
}
