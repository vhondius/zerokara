import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { KanaEntry } from "@/lib/kana-index";
import { entryAnswer, entryReadings } from "@/lib/kana-index";
import { rateSrsItem, type SrsItemType, type SrsRating } from "@/lib/progress-store";
import { ReportButton } from "@/components/lesson/ReportButton";
import { ExampleWords } from "@/components/lesson/ExampleWords";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { shortcutTargetOk } from "@/lib/shortcuts";

/** One card in a review session, for any deck (kana, kanji, vocabulary). */
export type ReviewCard = {
  /** The SRS item id (the character, or the vocabulary id). */
  id: string;
  front: ReactNode;
  back: ReactNode;
  frontLabel: string;
  backLabel: string;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  report?: ReactNode;
};

/** Review cards for kana and kanji practice. */
export function kanaReviewCards(entries: KanaEntry[], itemType: SrsItemType): ReviewCard[] {
  return entries.map((card) => ({
    id: card.char,
    front: <span className="jp text-8xl text-foreground">{card.char}</span>,
    back: (
      <span className="flex flex-col items-center gap-2">
        <span className="font-display text-5xl text-accent">{entryAnswer(card)}</span>
        {entryReadings(card) ? (
          <span className="jp text-base text-muted-foreground">{entryReadings(card)}</span>
        ) : null}
        {card.script === "kanji" ? (
          <span className="text-left">
            <ExampleWords words={card.example_words ?? []} max={3} />
          </span>
        ) : null}
      </span>
    ),
    frontLabel: card.char,
    backLabel: entryAnswer(card),
    footerLeft: `${card.stroke_count} stroke${card.stroke_count === 1 ? "" : "s"}`,
    footerRight: (
      <>
        Introduced in{" "}
        <span className="text-foreground">
          {card.unitLabel} — {card.unitTitle}
        </span>
      </>
    ),
    report: (
      <ReportButton
        sectionType={`practice_${itemType}_review`}
        itemType={itemType === "kanji" ? "kanji_character" : "kana_character"}
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
}

const RATINGS: {
  value: SrsRating;
  label: string;
  hint: string;
  key: string;
  cls: string;
}[] = [
  {
    value: "again",
    label: "Again",
    hint: "Didn't recall",
    key: "1",
    cls: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30",
  },
  {
    value: "hard",
    label: "Hard",
    hint: "Struggled",
    key: "2",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30",
  },
  {
    value: "good",
    label: "Good",
    hint: "Recalled",
    key: "3",
    cls: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/30",
  },
  {
    value: "easy",
    label: "Easy",
    hint: "Instant",
    key: "4",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30",
  },
];

/** How many times one card may come back after "Again" within a session. */
const MAX_REQUEUES = 2;

/**
 * One spaced-repetition session. The queue is fixed when the session starts
 * (rating a card changes what's due, which must not reshuffle the session);
 * "Again" puts the card back near the end of this session when that's turned
 * on in Settings → Study.
 */
export function ReviewFlashcards({
  cards,
  itemType,
  onRestart,
}: {
  cards: ReviewCard[];
  itemType: SrsItemType;
  onRestart?: () => void;
}) {
  const { study } = useTheme();
  const touch = useCoarsePointer();
  const [queue, setQueue] = useState<ReviewCard[]>(() => shuffle(cards));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Record<SrsRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const requeued = useRef<Record<string, number>>({});
  const started = useRef(false);

  // Progress loads after the first render: adopt the cards once they arrive,
  // as long as the session hasn't started.
  useEffect(() => {
    if (!started.current && queue.length === 0 && cards.length > 0) setQueue(shuffle(cards));
  }, [cards, queue.length]);

  const done = i >= queue.length;
  const card = done ? null : queue[i];
  const reviewed = Object.values(tally).reduce((a, b) => a + b, 0);

  const rate = useCallback(
    (r: SrsRating) => {
      if (!card) return;
      started.current = true;
      rateSrsItem(itemType, card.id, r);
      setTally((t) => ({ ...t, [r]: t[r] + 1 }));
      if (r === "again" && study.requeueAgain && (requeued.current[card.id] ?? 0) < MAX_REQUEUES) {
        requeued.current[card.id] = (requeued.current[card.id] ?? 0) + 1;
        setQueue((q) => [...q, card]);
      }
      setFlipped(false);
      setI((n) => n + 1);
    },
    [card, itemType, study.requeueAgain],
  );

  // Each new card takes focus, so Space/Enter flip it straight away.
  const flipRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    flipRef.current?.focus({ preventScroll: true });
  }, [i]);

  // Keyboard: Space/Enter/F flip; 1-4 rate (only when flipped).
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      // Space/Enter on the focused card already flips it as a button press.
      if (e.target === flipRef.current && (e.key === " " || e.key === "Enter")) return;
      if (!shortcutTargetOk(e, flipRef.current)) return;
      if (!flipped && (e.key === " " || e.key === "Enter" || e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped) {
        const match = RATINGS.find((r) => r.key === e.key);
        if (match) {
          e.preventDefault();
          rate(match.value);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, rate]);

  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Nothing to review right now. Check back later, or use Browse mode to keep practicing.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sheet p-8 text-center">
        <p className="font-display text-2xl text-foreground">Session complete</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You reviewed {reviewed} card{reviewed === 1 ? "" : "s"}: {tally.again} Again ·{" "}
          {tally.hard} Hard · {tally.good} Good · {tally.easy} Easy.
        </p>
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start another session
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          Card {i + 1} / {queue.length}
          {card!.report}
        </span>
        <span>
          {touch
            ? flipped
              ? "How well did you recall it?"
              : "Tap the card to reveal"
            : flipped
              ? "Rate: 1 Again · 2 Hard · 3 Good · 4 Easy"
              : "Space / Enter reveals"}
        </span>
      </div>
      <button
        type="button"
        ref={flipRef}
        data-flip
        onClick={() => setFlipped((f) => !f)}
        aria-label={
          flipped
            ? `Card showing answer ${card!.backLabel} for ${card!.frontLabel}. Rate your recall using the buttons below.`
            : `Card showing ${card!.frontLabel}. Activate to reveal the answer.`
        }
        aria-pressed={flipped}
        className="group relative flex min-h-64 w-full items-center justify-center rounded-2xl border border-border bg-card shadow-sheet p-4 transition-[border-color,box-shadow,translate] hover:border-accent hover:shadow-lift active:translate-y-px"
      >
        <span
          className={`transition-opacity ${flipped ? "opacity-0" : "opacity-100"}`}
          aria-hidden="true"
        >
          {card!.front}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center p-4 transition-opacity ${flipped ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          {card!.back}
        </span>
      </button>
      {card!.footerLeft || card!.footerRight ? (
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>{card!.footerLeft}</span>
          <span className="text-right">{card!.footerRight}</span>
        </div>
      ) : null}
      <div role="group" aria-label="Rate your recall" className="grid grid-cols-4 gap-2">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={!flipped}
            onClick={() => rate(r.value)}
            aria-label={`${r.label} — ${r.hint}. Keyboard shortcut ${r.key}.`}
            aria-keyshortcuts={r.key}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${r.cls}`}
          >
            <span className="block">
              {touch ? null : <span className="mr-1 text-[0.65rem] opacity-60">{r.key}</span>}
              {r.label}
            </span>
            <span className="mt-0.5 block text-[0.65rem] font-normal opacity-70">{r.hint}</span>
          </button>
        ))}
      </div>
    </div>
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
