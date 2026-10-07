import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { allHiragana, type KanaEntry } from "@/lib/kana-index";
import { useCompletedUnits } from "@/hooks/use-completed-units";
import { useReviewSession } from "@/hooks/use-srs";
import { useMistakeItems } from "@/hooks/use-mistakes";
import { Flashcards } from "./Flashcards";
import { ReviewFlashcards, kanaReviewCards } from "./ReviewFlashcards";
import { KanaQuiz } from "./KanaQuiz";
import { StrokeTrace } from "./StrokeTrace";

type Mode = "flashcards" | "quiz" | "trace" | "mistakes";
type Scope = "all" | "introduced";
type FlashMode = "browse" | "review";

export function HiraganaPractice({ initialChars }: { initialChars?: string } = {}) {
  const [mode, setMode] = useState<Mode>(initialChars ? "trace" : "flashcards");
  const [scope, setScope] = useState<Scope>(initialChars ? "all" : "introduced");
  const [flashMode, setFlashMode] = useState<FlashMode>("browse");
  const [charFilter, setCharFilter] = useState<string | null>(initialChars ?? null);
  const completed = useCompletedUnits();

  const all = useMemo(() => allHiragana(), []);
  const introduced = useMemo<KanaEntry[]>(
    () => all.filter((e) => completed.has(`${e.bookId}:${e.unitId}`)),
    [all, completed],
  );
  const basePool = scope === "all" ? all : introduced;
  const pool = charFilter ? basePool.filter((e) => charFilter.includes(e.char)) : basePool;
  const session = useReviewSession(pool, "kana", (k) => k.char);
  const [sessionKey, setSessionKey] = useState(0);
  const mistakeItems = useMistakeItems(pool, "kana", (e) => e.char);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/practice"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All practice
      </Link>
      <div className="mt-6 flex items-baseline gap-4">
        <span className="jp text-5xl text-accent">ひらがな</span>
        <h1 className="font-display text-4xl text-foreground">Hiragana</h1>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm">
          {(
            [
              { v: "flashcards", label: "Flashcards" },
              { v: "quiz", label: "Quiz" },
              { v: "trace", label: "Stroke tracing" },
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
              { v: "introduced", label: `Introduced so far (${introduced.length})` },
              { v: "all", label: `All (${all.length})` },
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

      {mode === "flashcards" ? (
        <div className="mt-4 inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
          {(
            [
              { v: "browse", label: "Browse" },
              { v: "review", label: `Review (${session.cards.length})` },
            ] as { v: FlashMode; label: string }[]
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setFlashMode(o.v)}
              className={`rounded px-3 py-1.5 transition-colors ${flashMode === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}

      {charFilter ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing just {pool.length} character{pool.length === 1 ? "" : "s"} from that box.
          </span>
          <button
            type="button"
            onClick={() => setCharFilter(null)}
            className="rounded border border-input bg-background px-2 py-1 hover:text-foreground"
          >
            Show full set
          </button>
        </div>
      ) : null}

      {scope === "introduced" && introduced.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No completed units yet. Finish a lesson in{" "}
          <Link to="/learn" className="text-foreground underline">
            Learn
          </Link>{" "}
          to unlock its characters here, or switch to "All".
        </div>
      ) : (
        <div className="mt-8">
          {mode === "flashcards" ? (
            flashMode === "review" ? (
              <ReviewFlashcards
                key={sessionKey}
                cards={kanaReviewCards(session.cards, "kana")}
                itemType="kana"
                onRestart={() => setSessionKey((k) => k + 1)}
              />
            ) : (
              <Flashcards cards={pool} />
            )
          ) : null}
          {mode === "quiz" ? <KanaQuiz pool={pool} /> : null}
          {mode === "trace" ? <StrokeTrace entries={pool} /> : null}
          {mode === "mistakes" ? (
            <KanaQuiz pool={mistakeItems} emptyMessage="No mistakes to review — nice work!" />
          ) : null}
        </div>
      )}
    </div>
  );
}
