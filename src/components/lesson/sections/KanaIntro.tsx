import { Link } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";
import { ExampleWords } from "../ExampleWords";

type Data = Extract<Section, { type: "kana_intro" }>;

const scriptLabel = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji" } as const;

export function KanaIntro({ section }: { section: Data }) {
  const script = section.data.script;
  const isKanji = script === "kanji";
  const eyebrow = `New ${scriptLabel[script]}`;

  return (
    <SectionShell eyebrow={eyebrow} title={section.title}>
      <div className={`grid gap-3 ${isKanji ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3"}`}>
        {section.data.characters.map((c) => (
          <div
            key={c.char}
            className="flex items-start gap-4 rounded-lg border border-border bg-background/60 p-4"
          >
            <span className="jp text-5xl leading-none text-accent">{c.char}</span>
            <div className="flex-1 space-y-1">
              {isKanji ? (
                <>
                  {c.meaning ? (
                    <div className="text-sm font-medium text-foreground">{c.meaning}</div>
                  ) : null}
                  {c.onyomi && c.onyomi.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      <span className="uppercase tracking-wide">On</span>{" "}
                      <span className="jp text-foreground/90">{c.onyomi.join("、")}</span>
                    </div>
                  ) : null}
                  {c.kunyomi && c.kunyomi.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      <span className="uppercase tracking-wide">Kun</span>{" "}
                      <span className="jp text-foreground/90">{c.kunyomi.join("、")}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm font-medium text-foreground">{c.romaji}</div>
              )}
              <div className="text-xs text-muted-foreground">
                {c.stroke_count} stroke{c.stroke_count === 1 ? "" : "s"}
              </div>
              {isKanji ? <ExampleWords words={c.example_words ?? []} /> : null}
            </div>
            <ReportButton
              sectionType="kana_intro"
              itemType={isKanji ? "kanji_character" : "kana_character"}
              itemId={c.char}
              label={`${c.char} (${c.romaji ?? c.meaning ?? ""})`}
              snapshot={c}
            />
          </div>
        ))}
      </div>
      {!isKanji ? (
        <Link
          to={script === "hiragana" ? "/practice/hiragana" : "/practice/katakana"}
          search={{ chars: section.data.characters.map((c) => c.char).join("") }}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <PenLine aria-hidden className="size-4" />
          Practice strokes for these {section.data.characters.length} characters
        </Link>
      ) : null}
    </SectionShell>
  );
}
