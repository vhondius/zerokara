import { useEffect, useMemo, useRef, useState } from "react";
import type { KanaEntry } from "@/lib/kana-index";
import { entryAnswer } from "@/lib/kana-index";
import { ReportButton } from "@/components/lesson/ReportButton";
import { markSrsDueNow, recordMistake, recordMistakeCorrect } from "@/lib/progress-store";
import { shortcutTargetOk } from "@/lib/shortcuts";

const BEST_KEY = "zerokara.quizbest.v1";
function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

type Direction = "kana-to-romaji" | "romaji-to-kana";
type Mode = "multiple-choice" | "typed";

const norm = (s: string) => s.trim().toLowerCase();

export function KanaQuiz({
  pool,
  emptyMessage = "No characters in this filter yet.",
}: {
  pool: KanaEntry[];
  emptyMessage?: string;
}) {
  const [direction, setDirection] = useState<Direction>("kana-to-romaji");
  const [mode, setMode] = useState<Mode>("multiple-choice");
  const [round, setRound] = useState(0);
  const [answered, setAnswered] = useState<null | { ok: boolean; picked: string }>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const [best, setBest] = useState(0);
  useEffect(() => setBest(readBest()), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  // Content-stable key for pool: `pool` gets a new array identity on every
  // progress-store notify (e.g. the recordMistake call from this very round's
  // answer), even when its contents haven't changed. Keying off this instead
  // of `pool` itself stops that churn from picking a new question mid-round.
  const poolKey = useMemo(() => pool.map((k) => k.char).join(","), [pool]);

  // Recently-shown chars, so a question doesn't repeat on the very next round.
  const recentRef = useRef<string[]>([]);
  useEffect(() => {
    recentRef.current = [];
  }, [poolKey]);

  const current = useMemo(() => {
    if (pool.length === 0) return null;
    const cap = Math.min(pool.length - 1, 4);
    const recent = recentRef.current.slice(-cap);
    const candidates = pool.filter((k) => !recent.includes(k.char));
    const from = candidates.length > 0 ? candidates : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    recentRef.current = [...recentRef.current, pick.char].slice(-cap - 1);
    return pick;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, poolKey]);

  const choices = useMemo(() => {
    if (!current || mode !== "multiple-choice") return [];
    const pick = (k: KanaEntry) => (direction === "kana-to-romaji" ? entryAnswer(k) : k.char);
    const correct = pick(current);
    const others = pool
      .filter((k) => pick(k) !== correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(pick);
    return [...others, correct].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mode, direction, poolKey]);

  // reset transient state on new question, and put focus back on the answer box
  useEffect(() => {
    setAnswered(null);
    setTyped("");
    inputRef.current?.focus();
  }, [round, direction, mode]);

  // After answering, focus "Next question" so Enter (or a screen tap) moves on.
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  const answer = current
    ? direction === "kana-to-romaji"
      ? entryAnswer(current)
      : current.char
    : "";

  const check = (picked: string) => {
    if (answered) return;
    const ok = norm(picked) === norm(answer);
    setAnswered({ ok, picked });
    setScore((s) => {
      const streak = ok ? s.streak + 1 : 0;
      if (streak > best) {
        setBest(streak);
        try {
          window.localStorage.setItem(BEST_KEY, String(streak));
        } catch {
          /* best streak just isn't remembered */
        }
      }
      return { right: s.right + (ok ? 1 : 0), total: s.total + 1, streak };
    });
    if (!current) return;
    const itemType = current.script === "kanji" ? "kanji" : "kana";
    if (ok) recordMistakeCorrect(itemType, current.char);
    else {
      recordMistake(itemType, current.char);
      markSrsDueNow(itemType, current.char);
    }
  };

  // Keyboard: 1-4 pick MC choice; Enter advances after answering.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Keys typed in the report box, a dialog or on another button aren't for the quiz.
      if (!shortcutTargetOk(e)) return;
      if (mode === "multiple-choice" && !answered) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0 && idx < choices.length) {
          e.preventDefault();
          check(choices[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, mode, choices, answer]);

  if (pool.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  if (!current) return null;

  const prompt = direction === "kana-to-romaji" ? current.char : entryAnswer(current);
  const isKanji = current.script === "kanji";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-xs">
        <SegmentGroup
          value={direction}
          onChange={setDirection}
          options={[
            { v: "kana-to-romaji", label: "Kana → romaji" },
            { v: "romaji-to-kana", label: "Romaji → kana" },
          ]}
        />
        <SegmentGroup
          value={mode}
          onChange={setMode}
          options={[
            { v: "multiple-choice", label: "Multiple choice" },
            { v: "typed", label: "Type answer" },
          ]}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground" aria-live="off">
        Score {score.right} / {score.total} · {score.streak} in a row
        {best > 0 ? ` · best ${best}` : ""}
        {score.streak >= 5 && score.streak % 5 === 0 ? " 🎉" : ""}
      </p>

      <div className="rounded-2xl border border-border bg-card shadow-sheet p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {direction === "kana-to-romaji"
            ? isKanji
              ? "What does this kanji mean?"
              : "Read this character"
            : isKanji
              ? "Which kanji means this?"
              : "Write this romaji as kana"}
        </p>
        <p
          className={`mt-3 ${direction === "kana-to-romaji" ? "jp text-7xl text-foreground" : "font-display text-6xl text-accent"}`}
        >
          {prompt}
        </p>

        {mode === "multiple-choice" ? (
          <div
            role="group"
            aria-label="Multiple choice answers"
            className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4"
          >
            {choices.map((c, idx) => {
              const isPicked = answered?.picked === c;
              const isCorrect = answered && norm(c) === norm(answer);
              const cls = answered
                ? isCorrect
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : isPicked
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-border bg-background/60 text-muted-foreground"
                : "border-border bg-background hover:border-accent";
              const shortcut = idx < 4 ? String(idx + 1) : undefined;
              const mark = answered ? (isCorrect ? "✓ " : isPicked ? "✗ " : "") : "";
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!!answered}
                  onClick={() => check(c)}
                  aria-label={
                    shortcut ? `Answer ${c}. Keyboard shortcut ${shortcut}.` : `Answer ${c}.`
                  }
                  aria-keyshortcuts={shortcut}
                  className={`relative rounded-md border px-3 py-3 text-lg transition-colors ${cls} ${direction === "kana-to-romaji" ? "font-display" : "jp"}`}
                >
                  {shortcut ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-1.5 top-1 text-[0.65rem] font-sans font-normal text-muted-foreground"
                    >
                      {shortcut}
                    </span>
                  ) : null}
                  {mark ? <span aria-hidden="true">{mark}</span> : null}
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!answered && typed.trim()) check(typed);
            }}
            className="mt-6 flex justify-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              readOnly={!!answered}
              autoFocus
              className={`w-48 rounded-md border border-input bg-background px-3 py-2 text-center text-lg outline-none focus:border-accent ${direction === "romaji-to-kana" ? "jp" : ""}`}
              placeholder={
                direction === "kana-to-romaji"
                  ? isKanji
                    ? "meaning"
                    : "romaji"
                  : isKanji
                    ? "漢字"
                    : "かな"
              }
            />
            <button
              type="submit"
              disabled={!!answered}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Check
            </button>
          </form>
        )}

        {answered ? (
          <div className="mt-5 text-sm">
            {answered.ok ? (
              <span className="font-medium text-emerald-700 dark:text-emerald-400">✓ Correct</span>
            ) : (
              <span className="text-destructive">
                ✗ Not quite — answer:{" "}
                <span className={direction === "kana-to-romaji" ? "font-display" : "jp"}>
                  {answer}
                </span>
              </span>
            )}
            <div className="mt-3">
              <button
                ref={nextRef}
                type="button"
                onClick={() => setRound((r) => r + 1)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Next question
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <span>
          Introduced in{" "}
          <span className="text-foreground">
            {current.unitLabel} — {current.unitTitle}
          </span>
        </span>
        <ReportButton
          sectionType={`practice_${current.script}_quiz`}
          itemType={current.script === "kanji" ? "kanji_character" : "kana_character"}
          itemId={current.char}
          label={`${current.char} · ${entryAnswer(current)}`}
          snapshot={current}
          context={{
            bookId: current.bookId,
            unitId: current.unitId,
            unitLabel: current.unitLabel,
            unitTitle: current.unitTitle,
          }}
        />
      </p>
    </div>
  );
}

function SegmentGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded px-3 py-1.5 transition-colors ${value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
