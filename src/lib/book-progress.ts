import { books, orderedUnits, previousBook } from "@/content/registry";
import type { Book, Unit } from "@/content/schema";
import { getUnitProgress, isBookTestPassed } from "@/lib/progress-store";

/** A book is open once the previous book's test is passed (Book 1 is always open). */
export function isBookUnlocked(bookId: string): boolean {
  const prev = previousBook(bookId);
  return !prev || isBookTestPassed(prev.id);
}

export type BookStatus = {
  book: Book;
  units: Unit[];
  done: number;
  firstIncomplete: Unit | undefined;
};

export function bookStatus(book: Book): BookStatus {
  const units = orderedUnits(book);
  const incomplete = units.filter((u) => !getUnitProgress(book.id, u.id)?.completed);
  return {
    book,
    units,
    done: units.length - incomplete.length,
    firstIncomplete: incomplete[0],
  };
}

/**
 * The book the learner is currently working through: the first one whose
 * test isn't passed yet. Every book before it is passed, so it's always
 * unlocked. `undefined` once every book test is passed.
 */
export function currentBook(): Book | undefined {
  return books.find((b) => !isBookTestPassed(b.id));
}
