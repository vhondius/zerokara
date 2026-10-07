import { Link, createFileRoute, notFound, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { books, getBook, orderedUnits } from "@/content/registry";
import type { Exercise, Unit } from "@/content/schema";
import {
  ExerciseInput,
  ExercisePrompt,
  kindLabel,
} from "@/components/lesson/sections/LessonActivities";
import { ReportButton } from "@/components/lesson/ReportButton";
import { setBookTestResult, type ExerciseResult } from "@/lib/progress-store";
import { isBookUnlocked } from "@/lib/book-progress";
import { clearTestDraft, loadTestDraft, saveTestDraft } from "@/lib/test-draft";
import { isPositiveStatus, isTestable } from "@/lib/grading";
import { useCompletedUnits } from "@/hooks/use-completed-units";
import { useHydrated } from "@/hooks/use-hydrated";
import { ColorScope } from "@/components/theme/ColorScope";
import { bookColor } from "@/lib/theme-colors";

export const Route = createFileRoute("/learn/$bookId/test")({
  loader: ({ params }) => {
    const book = getBook(params.bookId);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Book test" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Book test — ${loaderData.book.title}`;
    const desc = `A cumulative test sampling exercises from every lesson in ${loaderData.book.title}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/learn/${loaderData.book.id}/test` },
      ],
      links: [{ rel: "canonical", href: `/learn/${loaderData.book.id}/test` }],
    };
  },
  component: BookTestPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-foreground">Book not found</h1>
      <Link to="/learn/overview" className="mt-6 inline-block text-accent hover:underline">
        Back to the course
      </Link>
    </div>
  ),
});

const SAMPLE_RATE = 0.15;
const PASS_MARK = 0.75;

type TestItem = { exercise: Exercise; unit: Unit };

function sampleUnit(unit: Unit, take: (n: number) => number[]): TestItem[] {
  const exercises = unit.sections.flatMap((s) =>
    s.type === "lesson_activities" ? s.data.exercises.filter(isTestable) : [],
  );
  if (exercises.length === 0) return [];
  const count = Math.max(1, Math.ceil(exercises.length * SAMPLE_RATE));
  return take(exercises.length)
    .slice(0, count)
    .map((i) => ({ exercise: exercises[i], unit }));
}

function shuffledIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function BookTestPage() {
  const { book } = Route.useLoaderData();
  const hydrated = useHydrated();
  const completed = useCompletedUnits();
  const units = useMemo(() => orderedUnits(book), [book]);

  const remaining = units.filter((u) => !completed.has(`${book.id}:${u.id}`));
  const open = hydrated && units.length > 0 && isBookUnlocked(book.id);
  const finishedBook = remaining.length === 0;
  // A saved, unfinished attempt resumes straight away instead of asking again.
  const [started, setStarted] = useState(false);
  const hasDraft = hydrated && !!loadTestDraft(book.id);
  // Latch on: finishing a resumed attempt clears the draft, and without this
  // the intro would replace the result screen before it was ever seen.
  useEffect(() => {
    if (hasDraft) setStarted(true);
  }, [hasDraft]);
  // Bumped by "Take the test again" to remount the runner with a fresh sample.
  const [attempt, setAttempt] = useState(0);
  const questionCount = useMemo(
    () => units.reduce((n, u) => n + sampleUnit(u, (k) => [...Array(k).keys()]).length, 0),
    [units],
  );

  return (
    <ColorScope color={bookColor(book.id)}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/learn/overview"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Course overview
        </Link>
        <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
          Book test
        </div>
        <h1 className="mt-1 font-display text-4xl text-foreground">{book.title}</h1>

        {!hydrated ? (
          <p className="mt-8 text-sm text-muted-foreground">Checking your progress…</p>
        ) : !open ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8">
            <p className="font-display text-lg text-foreground">Test locked</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pass the previous book's test first.
            </p>
          </div>
        ) : finishedBook || started || hasDraft ? (
          <TestRunner
            key={attempt}
            book={book.id}
            units={units}
            onRetake={() => setAttempt((a) => a + 1)}
          />
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8">
            <p className="font-display text-lg text-foreground">Test out of this book</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't finished every unit yet ({units.length - remaining.length} of{" "}
              {units.length} done). If you already know this material, you can take the test now:
              passing it opens the next book. Your unit progress stays as it is.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {questionCount} questions, sampled from every unit. Get{" "}
              {Math.ceil(questionCount * PASS_MARK)} right ({PASS_MARK * 100}%) to pass.
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start the test
            </button>
            <p className="mt-6 text-sm text-muted-foreground">Or keep studying — units left:</p>
            <ul className="mt-2 space-y-1 text-sm">
              {remaining.slice(0, 8).map((u) => (
                <li key={u.id}>
                  <Link
                    to="/learn/$bookId/$unitId"
                    params={{ bookId: book.id, unitId: u.id }}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {u.label} — {u.title}
                  </Link>
                </li>
              ))}
              {remaining.length > 8 ? (
                <li className="text-muted-foreground">and {remaining.length - 8} more</li>
              ) : null}
            </ul>
          </div>
        )}
      </div>
    </ColorScope>
  );
}

const itemKey = (it: TestItem) => `${it.unit.id}::${it.exercise.id}`;

/** Rebuilds a saved attempt's question list; undefined if the content changed since. */
function restoreItems(units: Unit[], keys: string[]): TestItem[] | undefined {
  const byKey = new Map<string, TestItem>();
  for (const unit of units)
    for (const s of unit.sections)
      if (s.type === "lesson_activities")
        for (const exercise of s.data.exercises)
          byKey.set(`${unit.id}::${exercise.id}`, { unit, exercise });
  const items = keys.map((k) => byKey.get(k));
  return items.every(Boolean) ? (items as TestItem[]) : undefined;
}

function TestRunner({
  book,
  units,
  onRetake,
}: {
  book: string;
  units: Unit[];
  onRetake: () => void;
}) {
  // Resume a saved attempt if there is one, so an accidental reload, back
  // swipe or Android killing the app doesn't lose the run.
  const [initial] = useState(() => {
    const draft = loadTestDraft(book);
    const restored = draft ? restoreItems(units, draft.keys) : undefined;
    if (draft && restored)
      return {
        items: restored,
        results: draft.results,
        index: draft.index,
        resumed: true,
        stale: false,
      };
    return {
      items: units.flatMap((u) => sampleUnit(u, shuffledIndices)),
      results: {} as Record<string, ExerciseResult>,
      index: 0,
      resumed: false,
      // A draft existed but its questions no longer exist in the lessons.
      stale: !!draft,
    };
  });
  const items = initial.items;
  const [results, setResults] = useState<Record<string, ExerciseResult>>(initial.results);
  const [currentIndex, setCurrentIndex] = useState(initial.index);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished || items.length === 0) return;
    saveTestDraft(book, { keys: items.map(itemKey), results, index: currentIndex });
  }, [book, items, results, currentIndex, finished]);

  // Leaving through the app asks first; confirming discards the attempt.
  // A reload or app restart resumes from the saved draft instead.
  useBlocker({
    shouldBlockFn: () => {
      const leave = window.confirm("Leave the test? This attempt will be discarded.");
      if (leave) clearTestDraft(book);
      return !leave;
    },
    enableBeforeUnload: false,
    disabled: finished,
  });

  const graded = items.filter((it) => results[it.exercise.id]);
  const correct = items.filter((it) => isPositiveStatus(results[it.exercise.id]?.status));
  const mistakes = graded.length - correct.length;
  const pct = items.length === 0 ? 0 : correct.length / items.length;
  const passed = pct >= PASS_MARK;
  const needed = Math.ceil(items.length * PASS_MARK);
  const nextBook = books[books.findIndex((b) => b.id === book) + 1];

  const missed = items.filter((it) => !isPositiveStatus(results[it.exercise.id]?.status));
  const missedByUnit = new Map<string, { unit: Unit; count: number }>();
  for (const it of missed) {
    const entry = missedByUnit.get(it.unit.id) ?? { unit: it.unit, count: 0 };
    entry.count += 1;
    missedByUnit.set(it.unit.id, entry);
  }
  const review = [...missedByUnit.values()].sort((a, b) => b.count - a.count);

  const record = (id: string, answer: string, status: ExerciseResult["status"]) =>
    setResults((r) => ({ ...r, [id]: { answer, status, at: new Date().toISOString() } }));

  const advance = () => {
    if (currentIndex >= items.length - 1) {
      setBookTestResult(book, passed, pct);
      clearTestDraft(book);
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (items.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        No testable exercises were found in this book.
      </p>
    );
  }

  if (finished) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sheet p-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-foreground">{Math.round(pct * 100)}%</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                passed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {passed ? "✓ Passed" : "✗ Not passed"}
            </span>
            <span className="text-sm text-muted-foreground">
              {correct.length} / {items.length} questions
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground">
            {passed
              ? nextBook
                ? "Passed — this book is solid. The next book is open."
                : "Passed — that was the last book."
              : `Not passed yet: you needed ${needed} of ${items.length}. Review the lessons below and try again.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {passed && nextBook ? (
              <Link
                to="/learn/overview"
                hash={`book-${nextBook.id}`}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to {nextBook.title} →
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onRetake}
              className={
                passed && nextBook
                  ? "rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                  : "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              }
            >
              Take the test again
            </button>
          </div>
          {review.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Review these lessons
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {review.map(({ unit, count }) => (
                  <li key={unit.id}>
                    <Link
                      to="/learn/$bookId/$unitId"
                      params={{ bookId: book, unitId: unit.id }}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {unit.label} — {unit.title}
                    </Link>
                    <span className="text-muted-foreground"> · {count} missed</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {missed.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Review incorrect answers
            </p>
            <ol className="mt-3 space-y-4">
              {missed.map((it) => (
                <li
                  key={`${it.unit.id}-${it.exercise.id}`}
                  className="rounded-lg border border-border bg-card shadow-sheet p-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {kindLabel[it.exercise.kind] ?? it.exercise.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">{it.unit.label}</span>
                  </div>
                  <ExercisePrompt exercise={it.exercise} />
                  <div className="mt-3">
                    <ExerciseInput
                      exercise={it.exercise}
                      result={results[it.exercise.id]}
                      onRecord={(answer, status) => record(it.exercise.id, answer, status)}
                      locked
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    );
  }

  const current = items[currentIndex];
  const isLast = currentIndex === items.length - 1;

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
        {initial.resumed && currentIndex === initial.index
          ? `Resumed your saved attempt at question ${currentIndex + 1}. `
          : ""}
        {initial.stale && currentIndex === 0
          ? "Your saved attempt was from before the lessons changed, so this is a fresh set of questions. "
          : ""}
        Your answers are saved as you go. Only leaving the test on purpose discards this attempt.
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sheet p-5 text-sm">
        <p className="text-foreground">
          Question {currentIndex + 1} of {items.length}
        </p>
        <p className="mt-1 text-muted-foreground">
          Correct {correct.length} · Mistakes {mistakes} · Pass mark {needed} of {items.length}
        </p>
      </div>

      {/* Keyed per question so the answer inputs remount with empty state —
          they seed from `result` only on mount, so reusing the instance
          carried the previous question's typed/selected answer forward. */}
      <div
        key={`${current.unit.id}-${current.exercise.id}`}
        className="rounded-lg border border-border bg-card shadow-sheet p-4"
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-foreground">
            {kindLabel[current.exercise.kind] ?? current.exercise.kind}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{current.unit.label}</span>
            <ReportButton
              sectionType="lesson_activities"
              itemType="exercise"
              itemId={current.exercise.id}
              label={`${current.exercise.id} · ${kindLabel[current.exercise.kind] ?? current.exercise.kind}`}
              snapshot={current.exercise}
              context={{
                bookId: book,
                unitId: current.unit.id,
                unitLabel: current.unit.label,
                unitTitle: current.unit.title,
              }}
            />
          </span>
        </div>
        <ExercisePrompt exercise={current.exercise} />
        <div className="mt-3">
          <ExerciseInput
            exercise={current.exercise}
            result={results[current.exercise.id]}
            onRecord={(answer, status) => record(current.exercise.id, answer, status)}
            locked
            advanceLabel={isLast ? "Finish test" : "Next question"}
            onAdvance={advance}
          />
        </div>
      </div>
    </div>
  );
}
