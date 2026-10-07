import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { shortcutTargetOk } from "@/lib/shortcuts";
import type { KanaEntry } from "@/lib/kana-index";
import { entryAnswer, entryReadings } from "@/lib/kana-index";
import { ReportButton } from "@/components/lesson/ReportButton";
import { ExampleWords } from "@/components/lesson/ExampleWords";

export type DeckCard = {
  key: string;
  /** Large front face (usually the Japanese). */
  front: ReactNode;
  /** Back face, revealed on flip. */
  back: ReactNode;
  /** Smaller secondary line under the back face. */
  sub?: ReactNode;
  /** Left/right footer captions under the card. */
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  /** Plain-text description for screen readers. */
  frontLabel: string;
  backLabel: string;
  /** Optional "report an error" button for this card, rendered in the header row. */
  report?: ReactNode;
};

/**
 * Generic flip-card deck. Shared by kana/kanji practice, vocabulary practice
 * and the inline per-lesson vocabulary flashcards.
 */
export function FlashcardDeck({
  cards,
  empty,
  compact = false,
}: {
  cards: DeckCard[];
  empty?: ReactNode;
  compact?: boolean;
}) {
  const deck = useMemo(() => shuffle(cards), [cards]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const touch = useCoarsePointer();

  const isEmpty = deck.length === 0;
  const card = isEmpty ? null : deck[i % deck.length];

  const next = () => {
    if (isEmpty) return;
    setFlipped(false);
    setI((n) => (n + 1) % deck.length);
  };
  const prev = () => {
    if (isEmpty) return;
    setFlipped(false);
    setI((n) => (n - 1 + deck.length) % deck.length);
  };
  const flip = () => setFlipped((f) => !f);

  // Keyboard: ←/→ navigate, F flips. With several decks on one page (a
  // lesson's word groups), only the deck that has focus responds.
  useEffect(() => {
    if (isEmpty) return;
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!shortcutTargetOk(e, root)) return;
      const onlyDeck = document.querySelectorAll("[data-deck]").length <= 1;
      if (!onlyDeck && !root?.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, deck.length]);

  if (!card) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        {empty ?? "No cards in this filter yet."}
      </div>
    );
  }

  return (
    <div ref={rootRef} data-deck className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          Card {i + 1} / {deck.length}
          {card.report}
        </span>
        <span className="text-right">
          {touch ? "Tap the card to flip" : "Click card or press F to flip · ← → to navigate"}
        </span>
      </div>
      <button
        type="button"
        onClick={flip}
        aria-label={flipped ? card.backLabel : card.frontLabel}
        aria-pressed={flipped}
        className={`group relative flex w-full items-center justify-center rounded-2xl border border-border bg-card shadow-sheet transition-[border-color,box-shadow,translate] hover:border-accent hover:shadow-lift active:translate-y-px ${compact ? "h-40" : "h-64"}`}
      >
        <span
          className={`px-4 text-center transition-opacity ${flipped ? "opacity-0" : "opacity-100"}`}
          aria-hidden="true"
        >
          {card.front}
        </span>
        <span
          className={`absolute px-4 text-center transition-opacity ${flipped ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          <span className="flex flex-col items-center gap-2">
            <span className="font-display text-accent">{card.back}</span>
            {card.sub ? <span className="text-base text-muted-foreground">{card.sub}</span> : null}
          </span>
        </span>
      </button>
      {card.footerLeft || card.footerRight ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{card.footerLeft}</span>
          <span>{card.footerRight}</span>
        </div>
      ) : null}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous card"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next card"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/** Kana / kanji flashcards. */
export function Flashcards({ cards }: { cards: KanaEntry[] }) {
  const deckCards: DeckCard[] = cards.map((card) => ({
    key: card.char,
    front: <span className="jp text-8xl text-foreground">{card.char}</span>,
    back: <span className="text-5xl">{entryAnswer(card)}</span>,
    sub:
      entryReadings(card) || card.example_words?.length ? (
        <span className="block">
          {entryReadings(card) ? <span className="jp">{entryReadings(card)}</span> : null}
          {card.script === "kanji" ? (
            <span className="mx-auto block w-fit text-left">
              <ExampleWords words={card.example_words ?? []} max={3} />
            </span>
          ) : null}
        </span>
      ) : undefined,
    footerLeft: `${card.stroke_count} stroke${card.stroke_count === 1 ? "" : "s"}`,
    footerRight: (
      <>
        Introduced in{" "}
        <span className="text-foreground">
          {card.unitLabel} — {card.unitTitle}
        </span>
      </>
    ),
    frontLabel: `Card showing character ${card.char}. Activate to reveal the answer.`,
    backLabel: `Card showing answer ${entryAnswer(card)} for ${card.char}. Activate to hide the answer.`,
    report: (
      <ReportButton
        sectionType={`practice_${card.script}_flashcards`}
        itemType={card.script === "kanji" ? "kanji_character" : "kana_character"}
        itemId={card.char}
        label={`${card.char} · ${entryAnswer(card)}`}
        snapshot={card}
        context={{
          bookId: card.bookId,
          unitId: card.unitId,
          unitLabel: card.unitLabel,
          unitTitle: card.unitTitle,
        }}
      />
    ),
  }));

  return (
    <FlashcardDeck
      cards={deckCards}
      empty={
        <>
          No characters in this filter yet. Complete a unit that introduces hiragana, or switch to
          "All characters".
        </>
      }
    />
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
