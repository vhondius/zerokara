import { useState, type ReactNode } from "react";
import type { VocabWord } from "@/content/schema";
import { FlashcardDeck, type DeckCard } from "./Flashcards";

export type VocabDirection = "jp-to-en" | "en-to-jp";

export function vocabCards(
  words: VocabWord[],
  direction: VocabDirection,
  footer?: (w: VocabWord, i: number) => { left?: ReactNode; right?: ReactNode },
  report?: (w: VocabWord, i: number) => ReactNode,
): DeckCard[] {
  return words.map((w, i) => {
    const face = w.kanji || w.kana;
    const f = footer?.(w, i);
    const jpFront: DeckCard = {
      key: `${w.kana}-${i}`,
      report: report?.(w, i),
      front: (
        <span className="flex flex-col items-center gap-1">
          <span className="jp text-5xl text-foreground">{face}</span>
          {w.kanji && w.kana && w.kanji !== w.kana ? (
            <span className="jp text-lg text-muted-foreground">{w.kana}</span>
          ) : null}
        </span>
      ),
      back: <span className="text-3xl">{w.romaji}</span>,
      sub: <span>{w.english}</span>,
      footerLeft: f?.left,
      footerRight: f?.right,
      frontLabel: `Card showing ${face}. Activate to reveal the reading and meaning.`,
      backLabel: `Card showing ${w.romaji}, ${w.english}. Activate to hide the answer.`,
    };
    if (direction === "jp-to-en") return jpFront;
    return {
      ...jpFront,
      front: <span className="font-display text-3xl text-foreground">{w.english}</span>,
      back: <span className="jp text-4xl">{face}</span>,
      sub: <span>{w.romaji}</span>,
      frontLabel: `Card showing ${w.english}. Activate to reveal the Japanese.`,
      backLabel: `Card showing ${face}, ${w.romaji}. Activate to hide the answer.`,
    };
  });
}

/** Inline per-lesson vocabulary flashcards, shown under a vocabulary table. */
export function VocabFlashcards({ words, label }: { words: VocabWord[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<VocabDirection>("jp-to-en");

  if (words.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Flashcards{label ? ` · ${label}` : ""}{" "}
          <span className="text-muted-foreground">({words.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {open ? (
            <button
              type="button"
              onClick={() => setDirection((d) => (d === "jp-to-en" ? "en-to-jp" : "jp-to-en"))}
              className="rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {direction === "jp-to-en" ? "日本語 → English" : "English → 日本語"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {open ? "Hide" : "Practice these words"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="mt-4">
          <FlashcardDeck cards={vocabCards(words, direction)} compact />
        </div>
      ) : null}
    </div>
  );
}
