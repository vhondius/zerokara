import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Exercise, Section } from "@/content/schema";
import { useUnitProgress } from "@/hooks/use-unit-progress";
import { useUnitContext } from "@/components/lesson/unit-context";
import { getBook, orderedUnits } from "@/content/registry";
import type { ExerciseResult } from "@/lib/progress-store";
import {
  answerAsString,
  gradeAnswer,
  isCorrect,
  isLenientlyCorrect,
  isOptionCorrect,
  norm,
} from "@/lib/grading";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";

type Data = Extract<Section, { type: "lesson_activities" }>;

export const kindLabel: Record<string, string> = {
  fill_blank: "Fill in the blank",
  translate: "Translate",
  matching: "Match",
  multiple_choice: "Choose one",
  writing_practice: "Write",
  dialogue_translation: "Translate the dialogue",
  reading_comprehension: "Reading",
  mini_conversation: "Mini conversation",
};

export function LessonActivities({ section }: { section: Data }) {
  const { hydrated, results, completed } = useUnitProgress();
  const exercises = section.data.exercises;
  const answered = exercises.filter((ex) => results[ex.id]).length;
  const firstOpen = exercises.find((ex) => !results[ex.id]);

  const justCompleted = useJustCompleted();

  const jump = () => {
    if (!firstOpen) return;
    const el = document.getElementById(`exercise-${firstOpen.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  };

  return (
    <SectionShell eyebrow="Workbook" title={section.title}>
      {hydrated ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
          <span className="text-foreground">
            {answered} of {exercises.length} answered
            {completed ? <span className="text-muted-foreground"> · unit complete</span> : null}
          </span>
          {firstOpen ? (
            <button
              type="button"
              onClick={jump}
              className="font-medium text-accent hover:underline"
            >
              Jump to next unanswered ↓
            </button>
          ) : justCompleted ? (
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("unit-done")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="font-medium text-accent hover:underline"
            >
              See your result ↓
            </button>
          ) : null}
        </div>
      ) : null}
      <ol className="space-y-4">
        {exercises.map((ex, i) => (
          <ExerciseItem key={ex.id} index={i} exercise={ex} />
        ))}
      </ol>
    </SectionShell>
  );
}

/** True once the unit becomes complete during this visit (not on revisits). */
export function useJustCompleted() {
  const { hydrated, completed } = useUnitProgress();
  const wasComplete = useRef<boolean | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  useEffect(() => {
    if (!hydrated) return;
    if (wasComplete.current === null) wasComplete.current = completed;
    else if (completed && !wasComplete.current) {
      wasComplete.current = true;
      setJustCompleted(true);
    }
  }, [hydrated, completed]);
  return justCompleted;
}

/** Closes the page when answering the last exercise completes the unit. */
export function UnitDoneBanner() {
  const { bookId, unit, allExerciseIds } = useUnitContext();
  const { results } = useUnitProgress();
  const right = allExerciseIds.filter((id) => {
    const st = results[id]?.status;
    return st === "correct" || st === "self-correct" || st === "done";
  }).length;
  const book = getBook(bookId);
  const chain = book ? orderedUnits(book) : [];
  const next = chain[chain.findIndex((u) => u.id === unit.id) + 1];
  return (
    <div
      id="unit-done"
      role="status"
      className="scroll-mt-32 rounded-xl border border-border bg-card shadow-sheet p-6 text-center"
    >
      <span
        aria-hidden
        className="jp mx-auto mb-3 grid size-14 -rotate-6 place-items-center rounded-full border-2 border-accent text-2xl text-accent"
      >
        済
      </span>
      <p className="font-display text-2xl text-foreground">{unit.label} done</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {right} of {allExerciseIds.length} answered correctly.
      </p>
      <div className="mt-3">
        {next ? (
          <Link
            to="/learn/$bookId/$unitId"
            params={{ bookId, unitId: next.id }}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Next: {next.label} →
          </Link>
        ) : (
          <Link
            to="/learn/$bookId/test"
            params={{ bookId }}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Take the Book Test →
          </Link>
        )}
      </div>
    </div>
  );
}

function ExerciseItem({ exercise, index }: { exercise: Exercise; index: number }) {
  const { hydrated, results, record } = useUnitProgress();
  const result = results[exercise.id];

  return (
    <li
      id={`exercise-${exercise.id}`}
      className="scroll-mt-24 rounded-lg border border-border bg-background/60 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">
          {index + 1}. {kindLabel[exercise.kind] ?? exercise.kind}
        </span>
        <span className="flex items-center gap-2">
          <ReportButton
            sectionType="lesson_activities"
            itemType="exercise"
            itemId={exercise.id}
            label={`${exercise.id} · ${kindLabel[exercise.kind] ?? exercise.kind}`}
            snapshot={exercise}
          />
        </span>
      </div>

      <ExercisePrompt exercise={exercise} />

      <div className="mt-3">
        {/* Inputs seed their state from `result` on mount; saved progress only
            arrives after hydration, so remount once it does. */}
        <ExerciseInput
          key={hydrated ? "saved" : "initial"}
          exercise={exercise}
          result={result}
          onRecord={(answer, status) => record(exercise.id, answer, status)}
        />
      </div>
    </li>
  );
}

/** Picture, prompt and hint shown above an exercise's answer input. */
export function ExercisePrompt({ exercise }: { exercise: Exercise }) {
  return (
    <>
      {exercise.image_ref ? (
        <img
          src={exercise.image_ref}
          alt=""
          className="mt-2 max-h-64 rounded-md border border-border object-contain"
        />
      ) : null}
      {exercise.prompt ? (
        <p className="jp mt-2 text-base text-foreground">{exercise.prompt}</p>
      ) : null}
      {exercise.hint ? (
        <p className="mt-1 text-xs text-muted-foreground">Hint: {exercise.hint}</p>
      ) : null}
    </>
  );
}

export function StatusBadge({ result }: { result: ExerciseResult }) {
  const map: Record<string, { label: string; cls: string }> = {
    correct: {
      label: "✓ Correct",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    incorrect: { label: "✗ Incorrect", cls: "bg-destructive/15 text-destructive" },
    "self-correct": {
      label: "✓ Correct (you)",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    "self-incorrect": { label: "✗ Incorrect (you)", cls: "bg-destructive/15 text-destructive" },
    done: { label: "Done", cls: "bg-accent/15 text-accent" },
  };
  const m = map[result.status] ?? map.done;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

type ExerciseStatus = ExerciseResult["status"];
type InputProps = {
  exercise: Exercise;
  result: ExerciseResult | undefined;
  onRecord: (answer: string, status: ExerciseStatus) => void;
  /** Book test mode: once answered, the answer can't be changed or resubmitted. */
  locked?: boolean;
  /** Book test mode: label for the button that replaces Check/Resubmit once answered. */
  advanceLabel?: string;
  /** Book test mode: called instead of resubmitting once answered. Omit for a pure read-only review. */
  onAdvance?: () => void;
};

/** Replaces a variant's Check/Resubmit button once `locked` has a result — renders nothing without `onAdvance` (pure review). */
function AdvanceButton({ label, onAdvance }: { label?: string; onAdvance?: () => void }) {
  if (!onAdvance) return null;
  return (
    // Takes focus when it appears, so Enter (or a hardware keyboard) moves on.
    <button
      type="button"
      autoFocus
      onClick={onAdvance}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      {label ?? "Next question"}
    </button>
  );
}

const isPositive = (s: ExerciseStatus) => s === "correct" || s === "self-correct";

/** One-tap override for the lenient auto-grader. */
function GradeToggle({
  result,
  onFlip,
}: {
  result: ExerciseResult;
  onFlip: (status: ExerciseStatus) => void;
}) {
  if (result.status === "done") return null;
  const positive = isPositive(result.status);
  return (
    <button
      type="button"
      onClick={() => onFlip(positive ? "self-incorrect" : "self-correct")}
      className="rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
      title="The auto-grader is best-effort — flip it if it guessed wrong."
    >
      {positive ? "Actually, I missed it" : "Actually, I got it right"}
    </button>
  );
}

export function ExerciseInput({
  exercise,
  result,
  onRecord,
  locked,
  advanceLabel,
  onAdvance,
}: InputProps) {
  if (exercise.parts?.length) {
    return (
      <PartsAnswer
        exercise={exercise}
        result={result}
        onRecord={onRecord}
        locked={locked}
        advanceLabel={advanceLabel}
        onAdvance={onAdvance}
      />
    );
  }
  switch (exercise.kind) {
    case "multiple_choice":
      return (
        <MultipleChoice
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "fill_blank":
      return (
        <TextAnswer
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          mode="exact"
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "translate":
      return (
        <TextAnswer
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          mode="lenient"
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "dialogue_translation":
      return (
        <TextAnswer
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          mode="lenient"
          multiline
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "matching":
      return (
        <Matching
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "writing_practice":
      return <WritingDone result={result} onRecord={onRecord} />;
    case "reading_comprehension":
      return (
        <ReadingComprehension
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
    case "mini_conversation":
      return (
        <MiniConversation
          exercise={exercise}
          result={result}
          onRecord={onRecord}
          locked={locked}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
        />
      );
  }
}

/* ---------- multiple_choice ---------- */

function MultipleChoice({
  exercise,
  result,
  onRecord,
  locked,
  advanceLabel,
  onAdvance,
}: InputProps) {
  const options = exercise.options ?? [];
  const chosen = result?.answer;
  const done = locked && !!result;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, oi) => {
        const selected = chosen === opt;
        const correct = selected && result?.status === "correct";
        const incorrect = selected && result?.status === "incorrect";
        return (
          <button
            key={`${opt}-${oi}`}
            type="button"
            disabled={done}
            onClick={() =>
              onRecord(opt, isOptionCorrect(opt, exercise.answer) ? "correct" : "incorrect")
            }
            className={[
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              correct
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : incorrect
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : selected
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border bg-background hover:bg-muted/60 text-foreground",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
      {result ? (
        <div className="mt-2 flex w-full items-center gap-2">
          <StatusBadge result={result} />
          {result.status === "incorrect" ? (
            <span className="text-xs text-muted-foreground">
              Answer: <span className="text-foreground">{answerAsString(exercise.answer)}</span>
            </span>
          ) : null}
          {done ? <AdvanceButton label={advanceLabel} onAdvance={onAdvance} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- fill_blank & translate ---------- */

function TextAnswer({
  exercise,
  result,
  onRecord,
  mode,
  multiline = false,
  locked,
  advanceLabel,
  onAdvance,
}: InputProps & { mode: "exact" | "lenient"; multiline?: boolean }) {
  const [value, setValue] = useState(result?.answer ?? "");
  const done = locked && !!result;

  const submit = () => {
    if (!value.trim()) return;
    if (exercise.answer == null) {
      onRecord(value, "done");
      return;
    }
    const ok = mode === "exact" ? isCorrect(value, exercise.answer) : lenientGrade(value).ok;
    onRecord(value, ok ? "correct" : "incorrect");
  };

  // Plain-form answers count unless the prompt asks for polite speech.
  function lenientGrade(answer: string) {
    return gradeAnswer(answer, exercise.answer, {
      allowCasual: !/polite|keigo|formal/i.test(exercise.prompt ?? ""),
    });
  }
  const casualNote =
    mode === "lenient" && result?.status === "correct"
      ? lenientGrade(result.answer).note
      : undefined;

  return (
    <div className="space-y-2">
      <div className={multiline ? "space-y-2" : "flex flex-wrap gap-2"}>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={done}
            placeholder="Translate the whole exchange, one line per turn."
            rows={4}
            className="jp w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-70"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            disabled={done}
            autoFocus={locked && !result}
            placeholder="Your answer"
            className="jp min-w-0 flex-1 basis-40 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-70"
          />
        )}
        {done ? (
          <AdvanceButton label={advanceLabel} onAdvance={onAdvance} />
        ) : (
          <button
            type="button"
            onClick={submit}
            className={`rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${multiline ? "self-start" : ""}`}
          >
            {result ? "Resubmit" : "Check"}
          </button>
        )}
      </div>

      {result ? (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge result={result} />
            <GradeToggle result={result} onFlip={(status) => onRecord(result.answer, status)} />
          </div>
          <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Your answer:</span>{" "}
              <span className="jp text-foreground">{result.answer}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reference:</span>{" "}
              <span className="jp text-foreground">{answerAsString(exercise.answer) || "—"}</span>
            </div>
          </div>
          {casualNote ? <p className="mt-1 text-xs text-muted-foreground">{casualNote}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- multi-part answers ---------- */

function PartsAnswer({ exercise, result, onRecord, locked, advanceLabel, onAdvance }: InputProps) {
  const parts = exercise.parts ?? [];
  const initial: Record<number, string> = useMemo(() => {
    if (!result?.answer) return {};
    try {
      return JSON.parse(result.answer) as Record<number, string>;
    } catch {
      return {};
    }
  }, [result]);
  const [values, setValues] = useState<Record<number, string>>(initial);
  const done = locked && !!result;

  const submit = () => {
    if (!parts.some((_, i) => (values[i] ?? "").trim())) return;
    const allRight = parts.every((p, i) => isLenientlyCorrect(values[i] ?? "", p.answer));
    onRecord(JSON.stringify(values), allRight ? "correct" : "incorrect");
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {parts.map((part, i) => {
          const partOk = result ? isLenientlyCorrect(values[i] ?? "", part.answer) : false;
          return (
            <li
              key={i}
              className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {part.label}
              </span>
              <input
                type="text"
                value={values[i] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
                disabled={done}
                placeholder="Your answer"
                className="jp mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-70"
              />
              {result ? (
                <p className="mt-1 text-xs">
                  <span
                    className={
                      partOk ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    }
                  >
                    {partOk ? "Correct" : "Incorrect"}
                  </span>
                  <span className="text-muted-foreground"> · Reference: </span>
                  <span className="jp text-foreground">{answerAsString(part.answer)}</span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <AdvanceButton label={advanceLabel} onAdvance={onAdvance} />
        ) : (
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {result ? "Resubmit" : "Check"}
          </button>
        )}
        {result ? <StatusBadge result={result} /> : null}
        {result ? (
          <GradeToggle result={result} onFlip={(status) => onRecord(result.answer, status)} />
        ) : null}
      </div>
    </div>
  );
}

/* ---------- matching ---------- */

type MatchPair = { key: string; value: string };

function parseMatching(exercise: Exercise): {
  pairs: MatchPair[];
  keys: string[];
  values: string[];
} {
  const ref = answerAsString(exercise.answer);
  const pairs: MatchPair[] = ref
    .split(",")
    .map((chunk) => {
      const [k, v] = chunk.split("=");
      return { key: (k ?? "").trim(), value: (v ?? "").trim() };
    })
    .filter((p) => p.key && p.value);
  const keys = pairs.map((p) => p.key);
  const values = pairs.map((p) => p.value);
  return { pairs, keys, values };
}

/** Fisher-Yates. Keeps the dropdown from always listing answers in answer-key order. */
function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Matching({ exercise, result, onRecord, locked, advanceLabel, onAdvance }: InputProps) {
  const { pairs, keys, values } = useMemo(() => parseMatching(exercise), [exercise]);
  const shuffledValues = useMemo(() => shuffled(values), [values]);
  // Which answer tile each item holds (by tile index: answers can repeat, e.g. "wo").
  const initial: Record<string, number> = useMemo(() => {
    if (!result) return {};
    try {
      const saved = JSON.parse(result.answer) as Record<string, string>;
      const taken = new Set<number>();
      const out: Record<string, number> = {};
      for (const k of keys) {
        const idx = shuffledValues.findIndex((v, i) => v === saved[k] && !taken.has(i));
        if (idx >= 0) {
          out[k] = idx;
          taken.add(idx);
        }
      }
      return out;
    } catch {
      return {};
    }
  }, [result, keys, shuffledValues]);
  const [tiles, setTiles] = useState<Record<string, number>>(initial);
  const [active, setActive] = useState<string | null>(null);
  const done = locked && !!result;

  if (pairs.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Couldn't parse matching pairs from the answer key.
      </p>
    );
  }

  const picks: Record<string, string> = Object.fromEntries(
    Object.entries(tiles).map(([k, i]) => [k, shuffledValues[i]]),
  );
  const used = new Set(Object.values(tiles));
  const allChosen = keys.every((k) => tiles[k] !== undefined);
  // The item a tapped answer goes to: the one tapped last, else the first empty one.
  const target = active ?? keys.find((k) => tiles[k] === undefined) ?? null;

  const place = (tile: number) => {
    if (done || !target) return;
    setTiles((t) => ({ ...t, [target]: tile }));
    setActive(null);
  };

  const submit = () => {
    if (!allChosen) return;
    const allRight = pairs.every((p) => norm(picks[p.key] ?? "") === norm(p.value));
    onRecord(JSON.stringify(picks), allRight ? "correct" : "incorrect");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap an answer to fill the highlighted item. Tap a filled item to change it.
      </p>
      <div className="grid gap-2">
        {keys.map((k, ki) => {
          const correctVal = pairs.find((p) => p.key === k)?.value ?? "";
          const chosen = picks[k];
          const showState = !!result && !!chosen;
          const right = showState && norm(chosen) === norm(correctVal);
          const isTarget = !done && target === k;
          return (
            <div key={`${k}-${ki}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="jp min-w-0 basis-full text-sm text-foreground sm:basis-40">{k}</span>
              <button
                type="button"
                disabled={done}
                onClick={() => {
                  if (chosen !== undefined) setTiles(({ [k]: _removed, ...rest }) => rest);
                  setActive(k);
                }}
                className={[
                  "jp min-h-9 min-w-0 flex-1 rounded-md border px-3 py-1.5 text-left text-sm",
                  showState
                    ? right
                      ? "border-emerald-500/60 text-foreground"
                      : "border-destructive/60 text-foreground"
                    : isTarget
                      ? "border-accent ring-1 ring-accent"
                      : "border-input",
                  chosen ? "bg-background" : "bg-muted/40 text-muted-foreground",
                ].join(" ")}
              >
                {showState ? (right ? "✓ " : "✗ ") : null}
                {chosen ?? (isTarget ? "tap an answer below" : "—")}
              </button>
              {showState && !right ? (
                <span className="basis-full text-xs text-muted-foreground sm:basis-auto">
                  answer: <span className="jp text-foreground">{correctVal}</span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!done ? (
        <div className="flex flex-wrap gap-1.5">
          {shuffledValues.map((v, vi) => (
            <button
              key={`${v}-${vi}`}
              type="button"
              disabled={used.has(vi)}
              onClick={() => place(vi)}
              className="jp rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground hover:border-accent disabled:opacity-30"
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <AdvanceButton label={advanceLabel} onAdvance={onAdvance} />
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!allChosen}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {result ? "Resubmit" : "Check"}
          </button>
        )}
        {!done && !allChosen ? (
          <span className="text-xs text-muted-foreground">
            {keys.filter((k) => tiles[k] === undefined).length} left to match
          </span>
        ) : null}
        {result ? <StatusBadge result={result} /> : null}
      </div>
    </div>
  );
}

/* ---------- writing_practice ---------- */

function WritingDone({
  result,
  onRecord,
}: {
  result: ExerciseResult | undefined;
  onRecord: (answer: string, status: ExerciseStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onRecord("", "done")}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {result ? "Marked done" : "Mark as done"}
      </button>
      {result ? <StatusBadge result={result} /> : null}
      <span className="text-xs text-muted-foreground">
        Writing practice — do it on paper, then mark done.
      </span>
    </div>
  );
}

/* ---------- reading_comprehension ---------- */

type QAResults = Record<number, { answer: string; ok: boolean | null }>;

function ReadingComprehension({
  exercise,
  result,
  onRecord,
  locked,
  advanceLabel,
  onAdvance,
}: InputProps) {
  const questions = exercise.questions ?? [];
  const initial: QAResults = useMemo(() => {
    if (!result?.answer) return {};
    try {
      return JSON.parse(result.answer) as QAResults;
    } catch {
      return {};
    }
  }, [result]);
  const [answers, setAnswers] = useState<QAResults>(initial);
  const done = locked && !!result;

  if (questions.length === 0) {
    return <p className="text-xs italic text-muted-foreground">No questions provided.</p>;
  }

  const setAnswer = (i: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [i]: { answer: value, ok: prev[i]?.ok ?? null } }));

  const submit = () => {
    const scored: QAResults = {};
    questions.forEach((q, i) => {
      const a = answers[i]?.answer ?? "";
      scored[i] = { answer: a, ok: a.trim() ? isLenientlyCorrect(a, q.answer) : null };
    });
    setAnswers(scored);
    const anyAttempted = questions.some((_, i) => (scored[i]?.answer ?? "").trim());
    const allRight = questions.every((_, i) => scored[i]?.ok === true);
    onRecord(JSON.stringify(scored), !anyAttempted ? "done" : allRight ? "correct" : "incorrect");
  };

  return (
    <div className="space-y-4">
      {exercise.passage ? (
        <div className="jp rounded-md bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-line">
          {exercise.passage}
        </div>
      ) : null}
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const state = answers[i];
          return (
            <li key={i} className="space-y-1">
              <p className="jp text-sm text-foreground">
                {i + 1}. {q.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={state?.answer ?? ""}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  disabled={done}
                  placeholder="Your answer"
                  className="jp min-w-0 flex-1 basis-40 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-70"
                />
              </div>
              {state && state.ok !== null ? (
                <p className="text-xs">
                  <span
                    className={
                      state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    }
                  >
                    {state.ok ? "Correct" : "Incorrect"}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · Reference:{" "}
                    <span className="jp text-foreground">{answerAsString(q.answer) || "—"}</span>
                  </span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <AdvanceButton label={advanceLabel} onAdvance={onAdvance} />
        ) : (
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {result ? "Resubmit" : "Check"}
          </button>
        )}
        {result ? <StatusBadge result={result} /> : null}
        {result ? (
          <GradeToggle result={result} onFlip={(status) => onRecord(result.answer, status)} />
        ) : null}
      </div>
    </div>
  );
}

/* ---------- mini_conversation ---------- */

function MiniConversation({
  exercise,
  result,
  onRecord,
  locked,
  advanceLabel,
  onAdvance,
}: InputProps) {
  const lines = exercise.lines ?? [];
  const direction = exercise.direction ?? "j-to-e";
  const isJtoE = direction === "j-to-e";

  const initial: Record<number, string> = useMemo(() => {
    if (!result?.answer) return {};
    try {
      return JSON.parse(result.answer) as Record<number, string>;
    } catch {
      return {};
    }
  }, [result]);
  const [values, setValues] = useState<Record<number, string>>(initial);
  const done = locked && !!result;

  if (lines.length === 0) {
    return <p className="text-xs italic text-muted-foreground">No conversation lines.</p>;
  }

  const submit = () => {
    const anyFilled = lines.some((_, i) => (values[i] ?? "").trim());
    if (!anyFilled) return;
    const gradableIdx = lines
      .map((line, i) => i)
      .filter((i) => answerAsString(isJtoE ? lines[i].english : lines[i].japanese).trim());
    if (gradableIdx.length === 0) {
      onRecord(JSON.stringify(values), "done");
      return;
    }
    const allRight = gradableIdx.every((i) => {
      const reference = isJtoE ? lines[i].english : lines[i].japanese;
      return isLenientlyCorrect(values[i] ?? "", reference);
    });
    onRecord(JSON.stringify(values), allRight ? "correct" : "incorrect");
  };

  return (
    <div className="space-y-3">
      {/* The exercise prompt usually says this already; only fall back to it. */}
      {exercise.prompt ? null : (
        <p className="text-sm text-muted-foreground">
          {isJtoE ? "Translate each line into English." : "Translate each line into Japanese."}
        </p>
      )}
      <ol className="space-y-3">
        {lines.map((line, i) => {
          const sourceField = isJtoE ? line.japanese : line.english;
          const source = Array.isArray(sourceField) ? sourceField[0] : sourceField;
          const reference = isJtoE ? line.english : line.japanese;
          const hasReference = answerAsString(reference).trim().length > 0;
          const lineOk =
            result && hasReference ? isLenientlyCorrect(values[i] ?? "", reference) : false;
          return (
            <li
              key={i}
              className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {line.speaker}
                </span>
                <span className={isJtoE ? "jp text-foreground" : "text-foreground"}>{source}</span>
              </div>
              <input
                type="text"
                value={values[i] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
                disabled={done}
                placeholder={isJtoE ? "English translation" : "Japanese translation"}
                className={`mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-70 ${!isJtoE ? "jp" : ""}`}
              />
              {result && hasReference ? (
                <p className="mt-1 text-xs">
                  <span
                    className={
                      lineOk ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    }
                  >
                    {lineOk ? "Correct" : "Incorrect"}
                  </span>
                  <span className="text-muted-foreground"> · Reference: </span>
                  <span className={`text-foreground ${isJtoE ? "" : "jp"}`}>
                    {answerAsString(reference)}
                  </span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <AdvanceButton label={advanceLabel} onAdvance={onAdvance} />
        ) : (
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {result ? "Resubmit" : "Check"}
          </button>
        )}
        {result ? <StatusBadge result={result} /> : null}
        {result ? (
          <GradeToggle result={result} onFlip={(status) => onRecord(result.answer, status)} />
        ) : null}
      </div>
    </div>
  );
}
