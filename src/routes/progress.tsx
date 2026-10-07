import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProgressTick } from "@/hooks/use-unit-progress";
import { getState, resetAll, type ProgressState, type SrsItem } from "@/lib/progress-store";
import { buildReviewSession } from "@/hooks/use-srs";
import { useTheme } from "@/components/theme/ThemeProvider";
import { allVocabulary, vocabId } from "@/lib/vocab-index";
import { books, orderedUnits } from "@/content/registry";
import { allHiragana, allKanji, allKatakana, type KanaEntry } from "@/lib/kana-index";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Your progress — Japanese From Zero" },
      {
        name: "description",
        content:
          "Course completion, kana mastery grid, and spaced-repetition review queue — all stored locally in your browser.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your progress" },
      {
        property: "og:description",
        content: "Course completion, kana mastery, and review queue at a glance.",
      },
      { property: "og:url", content: "/progress" },
    ],
    links: [{ rel: "canonical", href: "/progress" }],
  }),
  component: ProgressPage,
});

type Mastery = "new" | "learning" | "young" | "mature";

function masteryOf(item: SrsItem | undefined): Mastery {
  if (!item || !item.last_reviewed_at) return "new";
  if (item.interval_days < 6) return "learning";
  if (item.interval_days <= 21) return "young";
  return "mature";
}

const masteryStyles: Record<Mastery, { chip: string; cell: string; label: string }> = {
  new: {
    chip: "bg-muted text-muted-foreground",
    cell: "bg-muted text-muted-foreground border-border",
    label: "New",
  },
  learning: {
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    cell: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
    label: "Learning",
  },
  young: {
    chip: "bg-primary/15 text-primary",
    cell: "bg-primary/15 text-primary border-primary/30",
    label: "Young",
  },
  mature: {
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    cell: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-400",
    label: "Mature",
  },
};

function ProgressPageInner() {
  useProgressTick(); // subscribe to re-render on store changes
  const hydrated = useHydrated();
  const { study } = useTheme();
  const state: ProgressState = hydrated
    ? getState()
    : { units: {}, srs: {}, mistakes: {}, book_tests: {} };
  const completed = (e: { bookId: string; unitId: string }) =>
    !!state.units[`${e.bookId}:${e.unitId}`]?.completed;

  // Only what the learner has actually reached: characters from completed units.
  const hiragana = useMemo(() => allHiragana(), []).filter(completed);
  const katakana = useMemo(() => allKatakana(), []).filter(completed);
  const kanji = useMemo(() => allKanji(), []).filter(completed);
  const vocabulary = useMemo(() => allVocabulary(), []).filter(completed);

  const perBook = books.map((book) => {
    const units = orderedUnits(book);
    const done = units.filter((u) => state.units[`${book.id}:${u.id}`]?.completed).length;
    return { book, done, total: units.length, test: state.book_tests[book.id] };
  });
  const totalUnits = perBook.reduce((a, b) => a + b.total, 0);
  const doneUnits = perBook.reduce((a, b) => a + b.done, 0);
  const pct = totalUnits ? Math.round((doneUnits / totalUnits) * 100) : 0;

  // Same rule as the practice pages' "Review (N)" buttons.
  const ready = hydrated
    ? [
        buildReviewSession(hiragana, "kana", (k) => k.char, study).cards.length,
        buildReviewSession(katakana, "kana", (k) => k.char, study).cards.length,
        buildReviewSession(kanji, "kanji", (k) => k.char, study).cards.length,
        buildReviewSession(vocabulary, "vocabulary", vocabId, study).cards.length,
      ]
    : [0, 0, 0, 0];
  const readyTotal = ready.reduce((a, b) => a + b, 0);
  const mistakes = Object.keys(state.mistakes).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl text-foreground">Progress</h1>
      <p className="mt-2 text-muted-foreground">
        Everything on this page reads from your local browser storage — nothing is synced or sent
        anywhere.
      </p>

      {/* Top stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Units completed" value={`${doneUnits} / ${totalUnits}`} />
        <Stat
          label="Ready to review"
          value={readyTotal}
          action={
            readyTotal > 0 ? (
              <span className="flex flex-wrap gap-x-3 text-xs">
                {ready[0] + ready[1] > 0 ? (
                  <Link to="/practice/hiragana" className="font-medium text-accent hover:underline">
                    Kana ({ready[0] + ready[1]}) →
                  </Link>
                ) : null}
                {ready[2] > 0 ? (
                  <Link to="/practice/kanji" className="font-medium text-accent hover:underline">
                    Kanji ({ready[2]}) →
                  </Link>
                ) : null}
                {ready[3] > 0 ? (
                  <Link
                    to="/practice/vocabulary"
                    className="font-medium text-accent hover:underline"
                  >
                    Words ({ready[3]}) →
                  </Link>
                ) : null}
              </span>
            ) : null
          }
        />
        <Stat
          label="Mistakes to fix"
          value={mistakes}
          action={
            mistakes > 0 ? (
              <Link to="/practice" className="text-xs font-medium text-accent hover:underline">
                Practice them →
              </Link>
            ) : null
          }
        />
      </div>

      {/* Course completion */}
      <section className="mt-12" aria-labelledby="course-heading">
        <h2 id="course-heading" className="font-display text-2xl text-foreground">
          Course completion
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-card shadow-sheet p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Overall — {doneUnits} of {totalUnits} units
            </span>
            <span className="font-display text-2xl text-foreground">{pct}%</span>
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall course completion"
          >
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {perBook.map(({ book, done, total, test }) => (
              <SegmentBar
                key={book.id}
                label={book.title}
                done={done}
                total={total}
                note={
                  test
                    ? `Book test ${Math.round(test.score * 100)}%${test.passed ? " ✓ passed" : ""}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </section>

      <MasteryGrid
        title="Hiragana"
        entries={hiragana}
        itemType="kana"
        to="/practice/hiragana"
        srs={state.srs}
        empty="No hiragana yet. They're introduced from Book 1 Lesson 1 on."
      />
      <MasteryGrid
        title="Katakana"
        entries={katakana}
        itemType="kana"
        to="/practice/katakana"
        srs={state.srs}
        empty="No katakana yet. Book 2 teaches them."
      />
      <MasteryGrid
        title="Kanji"
        entries={kanji}
        itemType="kanji"
        to="/practice/kanji"
        srs={state.srs}
        empty="No kanji yet. Book 3 starts teaching them."
      />

      {hydrated ? (
        <div className="mt-12 text-right">
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset all local progress?")) {
                resetAll();
                location.reload();
              }
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Reset local progress
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MasteryGrid({
  title,
  entries,
  itemType,
  to,
  srs,
  empty,
}: {
  title: string;
  entries: KanaEntry[];
  itemType: "kana" | "kanji";
  to: "/practice/hiragana" | "/practice/katakana" | "/practice/kanji";
  srs: Record<string, SrsItem>;
  empty: string;
}) {
  const counts: Record<Mastery, number> = { new: 0, learning: 0, young: 0, mature: 0 };
  const rows = entries.map((e) => {
    const m = masteryOf(srs[`${itemType}:${e.char}`]);
    counts[m]++;
    return { e, m };
  });
  return (
    <section className="mt-12" aria-label={`${title} mastery`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{entries.length} introduced</span>
      </div>
      {entries.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(Object.keys(masteryStyles) as Mastery[]).map((m) => (
              <span
                key={m}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${masteryStyles[m].chip}`}
              >
                <MasteryDots mastery={m} />
                <span className="font-medium">{masteryStyles[m].label}</span>
                <span className="opacity-70">{counts[m]}</span>
              </span>
            ))}
          </div>
          <div
            className="mt-6 grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(3rem, 1fr))" }}
          >
            {rows.map(({ e, m }) => (
              <KanaCell key={e.char} entry={e} mastery={m} to={to} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** Mastery shown by dots as well as colour: none for new, 1–3 for learning, young, mature. */
function MasteryDots({ mastery }: { mastery: Mastery }) {
  const n = { new: 0, learning: 1, young: 2, mature: 3 }[mastery];
  if (n === 0) return null;
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-current" />
      ))}
    </span>
  );
}

function Stat({
  label,
  value,
  action,
}: {
  label: string;
  value: number | string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sheet p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function SegmentBar({
  label,
  done,
  total,
  note,
}: {
  label: string;
  done: number;
  total: number;
  note?: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {done} / {total}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} completion`}
      >
        <div className="h-full bg-accent/80" style={{ width: `${pct}%` }} />
      </div>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function KanaCell({
  entry,
  mastery,
  to,
}: {
  entry: KanaEntry;
  mastery: Mastery;
  to: "/practice/hiragana" | "/practice/katakana" | "/practice/kanji";
}) {
  const style = masteryStyles[mastery];
  const answer = entry.romaji ?? entry.meaning ?? "";
  return (
    <Link
      to={to}
      aria-label={`${entry.char} (${answer}) — ${style.label}. Introduced in ${entry.unitLabel}.`}
      title={`${entry.char} · ${answer} — ${style.label}`}
      className={`jp relative flex aspect-square items-center justify-center rounded-md border text-2xl transition-transform hover:scale-105 ${style.cell}`}
    >
      {entry.char}
      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
        <MasteryDots mastery={mastery} />
      </span>
    </Link>
  );
}

function ProgressPage() {
  return (
    <ColorScope color={SECTION_COLORS.progress}>
      <ProgressPageInner />
    </ColorScope>
  );
}
