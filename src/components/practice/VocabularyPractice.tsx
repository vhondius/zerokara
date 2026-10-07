import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { allVocabulary, vocabAnswers, vocabId, type VocabEntry } from "@/lib/vocab-index";
import { useCompletedUnits } from "@/hooks/use-completed-units";
import { useMistakeItems } from "@/hooks/use-mistakes";
import { FlashcardDeck } from "./Flashcards";
import { vocabCards, type VocabDirection } from "./VocabFlashcards";
import { isLenientlyCorrect } from "@/lib/grading";
import { recordMistake, recordMistakeCorrect } from "@/lib/progress-store";
import { ReportButton } from "@/components/lesson/ReportButton";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { useReviewSession } from "@/hooks/use-srs";
import { ReviewFlashcards, type ReviewCard } from "./ReviewFlashcards";

/** Review cards for vocabulary: the Japanese on the front, meaning and reading on the back. */
function vocabReviewCards(words: VocabEntry[]): ReviewCard[] {
  return words.map((w) => {
    const face = w.kanji || w.kana;
    return {
      id: vocabId(w),
      front: <span className="jp text-6xl text-foreground">{face}</span>,
      back: (
        <span className="flex flex-col items-center gap-2 text-center">
          <span className="font-display text-3xl text-accent">{w.english}</span>
          <span className="jp text-base text-muted-foreground">
            {w.kanji ? `${w.kana} · ` : ""}
            {w.romaji}
          </span>
        </span>
      ),
      frontLabel: face,
      backLabel: w.english,
      footerLeft: w.theme,
      footerRight: (
        <>
          Introduced in{" "}
          <span className="text-foreground">
            {w.unitLabel} — {w.unitTitle}
          </span>
        </>
      ),
      report: (
        <ReportButton
          sectionType="practice_vocabulary_review"
          itemType="vocabulary_word"
          itemId={vocabId(w)}
          label={`${face} · ${w.english}`}
          snapshot={w}
          context={{
            bookId: w.bookId,
            unitId: w.unitId,
            unitLabel: w.unitLabel,
            unitTitle: w.unitTitle,
          }}
        />
      ),
    };
  });
}

type Mode = "flashcards" | "review" | "quiz" | "mistakes";
type Scope = "all" | "introduced";

export function VocabularyPractice() {
  const [mode, setMode] = useState<Mode>("flashcards");
  const [scope, setScope] = useState<Scope>("introduced");
  const [direction, setDirection] = useState<VocabDirection>("jp-to-en");
  const [book, setBook] = useState<string>("all");
  const completed = useCompletedUnits();

  const all = useMemo(() => allVocabulary(), []);
  const bookIds = useMemo(() => [...new Set(all.map((w) => w.bookId))], [all]);
  const scoped = useMemo<VocabEntry[]>(
    () =>
      all
        .filter((w) => scope === "all" || completed.has(`${w.bookId}:${w.unitId}`))
        .filter((w) => book === "all" || w.bookId === book),
    [all, scope, book, completed],
  );
  const mistakeItems = useMistakeItems(scoped, "vocabulary", vocabId);
  const session = useReviewSession(scoped, "vocabulary", vocabId);
  const [sessionKey, setSessionKey] = useState(0);

  const cards = useMemo(
    () =>
      vocabCards(
        scoped,
        direction,
        (_w, i) => ({
          left: scoped[i]?.theme,
          right: (
            <>
              Introduced in{" "}
              <span className="text-foreground">
                {scoped[i]?.unitLabel} — {scoped[i]?.unitTitle}
              </span>
            </>
          ),
        }),
        (_w, i) =>
          scoped[i] ? (
            <ReportButton
              sectionType="practice_vocabulary_flashcards"
              itemType="vocabulary_word"
              itemId={vocabId(scoped[i])}
              label={`${scoped[i].kanji || scoped[i].kana} · ${scoped[i].english}`}
              snapshot={scoped[i]}
              context={{
                bookId: scoped[i].bookId,
                unitId: scoped[i].unitId,
                unitLabel: scoped[i].unitLabel,
                unitTitle: scoped[i].unitTitle,
              }}
            />
          ) : undefined,
      ),
    [scoped, direction],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/practice"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All practice
      </Link>
      <div className="mt-6 flex items-baseline gap-4">
        <span className="jp text-5xl text-accent">単語</span>
        <h1 className="font-display text-4xl text-foreground">Vocabulary</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Every word taught across the course, drillable outside the lessons.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm">
          {(
            [
              { v: "flashcards", label: "Flashcards" },
              { v: "review", label: `Review (${session.cards.length})` },
              { v: "quiz", label: "Quiz" },
              { v: "mistakes", label: `Mistakes (${mistakeItems.length})` },
            ] as { v: Mode; label: string }[]
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMode(o.v)}
              className={`rounded px-3 py-1.5 transition-colors ${mode === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
          {(
            [
              { v: "introduced", label: "Introduced so far" },
              { v: "all", label: "All" },
            ] as { v: Scope; label: string }[]
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setScope(o.v)}
              className={`rounded px-3 py-1.5 transition-colors ${scope === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          Book
          <select
            value={book}
            onChange={(e) => setBook(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
          >
            <option value="all">All books</option>
            {bookIds.map((id) => (
              <option key={id} value={id}>
                {all.find((w) => w.bookId === id)?.bookTitle ?? id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === "jp-to-en" ? "en-to-jp" : "jp-to-en"))}
          className="rounded border border-input bg-background px-2 py-1 hover:text-foreground"
        >
          {direction === "jp-to-en" ? "日本語 → English" : "English → 日本語"}
        </button>
        <span>{scoped.length} words</span>
      </div>

      <div className="mt-8">
        {mode === "mistakes" ? (
          <VocabQuiz pool={mistakeItems} direction={direction} />
        ) : scoped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No vocabulary in this filter yet. Finish a lesson in{" "}
            <Link to="/learn" className="text-foreground underline">
              Learn
            </Link>{" "}
            or switch to "All".
          </div>
        ) : mode === "flashcards" ? (
          <FlashcardDeck cards={cards} />
        ) : mode === "review" ? (
          <ReviewFlashcards
            key={sessionKey}
            cards={vocabReviewCards(session.cards)}
            itemType="vocabulary"
            onRestart={() => setSessionKey((k) => k + 1)}
          />
        ) : (
          <VocabQuiz pool={scoped} direction={direction} />
        )}
      </div>
    </div>
  );
}

function VocabQuiz({ pool, direction }: { pool: VocabEntry[]; direction: VocabDirection }) {
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState("");
  // The verdict for this round. It's only written to the mistakes list when
  // moving on, so "Actually, I got it right" can still change it.
  const [answered, setAnswered] = useState<null | { ok: boolean; flipped?: boolean }>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const touch = useCoarsePointer();
  const [score, setScore] = useState({ right: 0, total: 0 });

  // Content-stable key for pool: `pool` gets a new array identity on every
  // progress-store notify (e.g. the recordMistake call from this very round's
  // answer), even when its contents haven't changed. Keying off this instead
  // of `pool` itself stops that churn from picking a new word mid-round.
  const poolKey = useMemo(() => pool.map(vocabId).join(","), [pool]);

  // Recently-shown words, so a question doesn't repeat on the very next round.
  const recentRef = useRef<string[]>([]);
  useEffect(() => {
    recentRef.current = [];
  }, [poolKey]);

  const current = useMemo(() => {
    if (pool.length === 0) return null;
    const cap = Math.min(pool.length - 1, 4);
    const recent = recentRef.current.slice(-cap);
    const candidates = pool.filter((w) => !recent.includes(vocabId(w)));
    const from = candidates.length > 0 ? candidates : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    recentRef.current = [...recentRef.current, vocabId(pick)].slice(-cap - 1);
    return pick;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, poolKey]);

  const next = () => {
    if (current && answered) {
      if (answered.ok) recordMistakeCorrect("vocabulary", vocabId(current));
      else recordMistake("vocabulary", vocabId(current));
    }
    setAnswered(null);
    setTyped("");
    setRound((r) => r + 1);
    inputRef.current?.focus();
  };

  if (!current) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No mistakes to review — nice work!
      </div>
    );
  }

  const jpFace = current.kanji || current.kana;
  const prompt = direction === "jp-to-en" ? jpFace : current.english;
  const accepted = vocabAnswers(current, direction);

  const check = () => {
    if (answered || !typed.trim()) return;
    const ok = accepted.some((a) => isLenientlyCorrect(typed, a));
    setAnswered({ ok });
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
  };

  const markRight = () => {
    if (!answered || answered.ok) return;
    setAnswered({ ok: true, flipped: true });
    setScore((s) => ({ ...s, right: s.right + 1 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          Score {score.right} / {score.total}
          <ReportButton
            sectionType="practice_vocabulary_quiz"
            itemType="vocabulary_word"
            itemId={vocabId(current)}
            label={`${jpFace} · ${current.english}`}
            snapshot={current}
            context={{
              bookId: current.bookId,
              unitId: current.unitId,
              unitLabel: current.unitLabel,
              unitTitle: current.unitTitle,
            }}
          />
        </span>
        {touch ? null : <span>Enter to check, Enter again for the next word</span>}
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sheet p-10 text-center">
        <div
          className={
            direction === "jp-to-en"
              ? "jp text-5xl text-foreground"
              : "font-display text-3xl text-foreground"
          }
        >
          {prompt}
        </div>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (answered) next();
          else check();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          readOnly={!!answered}
          autoFocus
          placeholder={direction === "jp-to-en" ? "English meaning" : "Japanese (kana or romaji)"}
          className="jp min-w-0 flex-1 basis-40 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent read-only:opacity-70"
        />
        <button
          type="submit"
          disabled={!!answered}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Check
        </button>
      </form>
      {answered ? (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <span
            className={answered.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}
          >
            {answered.ok
              ? answered.flipped
                ? "✓ Counted as correct"
                : "✓ Correct"
              : "✗ Incorrect"}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="jp text-foreground">{jpFace}</span>
          <span className="text-muted-foreground">
            {" "}
            ({current.romaji}) — {current.english}
          </span>
          <div className="mt-1 text-xs text-muted-foreground">
            {current.unitLabel} — {current.unitTitle}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {!answered.ok ? (
              <button
                type="button"
                onClick={markRight}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Actually, I got it right
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
