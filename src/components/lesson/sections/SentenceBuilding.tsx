import { useMemo, useState } from "react";
import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";

type Data = Extract<Section, { type: "sentence_building" }>;

export function SentenceBuilding({ section }: { section: Data }) {
  return (
    <SectionShell
      eyebrow="Sentence building"
      title={section.title}
      action={
        <ReportButton
          sectionType="sentence_building"
          itemType="prompt_list"
          itemId={section.title ?? "sentence_building"}
          label={section.title ?? "Sentence building"}
          snapshot={section.data}
        />
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Tap the words in the right order to build each sentence.
      </p>
      <ol className="space-y-3">
        {section.data.prompts.map((p, i) =>
          p.includes(" / ") ? (
            <WordOrder key={i} words={p.split(" / ").map((w) => w.trim())} />
          ) : (
            // A few prompts are patterns to complete ("Isogashii ___, ___."), not word sets.
            <li key={i} className="jp rounded-md bg-muted/50 px-4 py-3 text-base text-foreground">
              {p}
            </li>
          ),
        )}
      </ol>
    </SectionShell>
  );
}

/** Shuffled, but never already in the right order (when the words allow it). */
function scramble(words: string[]): number[] {
  const idx = words.map((_, i) => i);
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (idx.map((i) => words[i]).join(" ") !== words.join(" ")) break;
  }
  return idx;
}

/** One sentence: tap tiles into order, check, retry; the answer shows after two misses. */
function WordOrder({ words }: { words: string[] }) {
  const order = useMemo(() => scramble(words), [words]);
  const [picked, setPicked] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<null | "right" | "wrong">(null);
  const [misses, setMisses] = useState(0);

  const built = picked.map((i) => words[i]).join(" ");
  const complete = picked.length === words.length;

  const check = () => {
    // Compare words, not tile positions: a sentence can repeat a word ("no").
    const right = built === words.join(" ");
    setVerdict(right ? "right" : "wrong");
    if (!right) setMisses((m) => m + 1);
  };
  const reset = () => {
    setPicked([]);
    setVerdict(null);
  };

  return (
    <li className="rounded-lg border border-border bg-background/60 p-3">
      <div
        className={`jp flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 ${
          verdict === "right"
            ? "border-emerald-500/60"
            : verdict === "wrong"
              ? "border-destructive/60"
              : "border-border"
        }`}
        aria-label="Your sentence"
      >
        {picked.length === 0 ? (
          <span className="text-sm text-muted-foreground">Tap the words below…</span>
        ) : (
          picked.map((i, pos) => (
            <button
              key={`${i}-${pos}`}
              type="button"
              disabled={verdict === "right"}
              onClick={() => {
                setPicked((p) => p.filter((_, k) => k !== pos));
                setVerdict(null);
              }}
              className="rounded-md bg-primary/15 px-2.5 py-1 text-base text-foreground hover:bg-primary/25"
            >
              {words[i]}
            </button>
          ))
        )}
      </div>

      <div className="jp mt-2 flex flex-wrap gap-1.5">
        {order.map((i) => (
          <button
            key={i}
            type="button"
            disabled={picked.includes(i)}
            onClick={() => {
              setPicked((p) => [...p, i]);
              setVerdict(null);
            }}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-base text-foreground hover:border-accent disabled:invisible"
          >
            {words[i]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={check}
          disabled={!complete || verdict === "right"}
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Check
        </button>
        {picked.length > 0 && verdict !== "right" ? (
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        ) : null}
        {verdict === "right" ? (
          <span className="text-emerald-700 dark:text-emerald-400">✓ Correct</span>
        ) : verdict === "wrong" ? (
          <span className="text-destructive">✗ Not quite — try another order</span>
        ) : null}
      </div>
      {misses >= 2 && verdict !== "right" ? (
        <p className="jp mt-2 text-sm text-muted-foreground">Answer: {words.join(" ")}</p>
      ) : null}
    </li>
  );
}
