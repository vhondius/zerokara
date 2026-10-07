import type { Section, VocabWord } from "@/content/schema";
import { VocabFlashcards } from "@/components/practice/VocabFlashcards";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";

type Data = Extract<Section, { type: "vocabulary_groups" }>;

/** Two columns that fit a phone: Japanese (kanji over kana) | English (romaji under it). */
export function VocabTable({ words }: { words: VocabWord[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {words.map((w, i) => (
        <li
          key={i}
          className="grid grid-cols-2 items-baseline gap-x-4 bg-background/40 px-4 py-2.5"
        >
          <span className="min-w-0">
            <span className="jp block text-lg leading-snug text-foreground">
              {w.kanji ?? w.kana}
            </span>
            {w.kanji ? (
              <span className="jp block text-sm text-muted-foreground">{w.kana}</span>
            ) : null}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block text-foreground/90">{w.english}</span>
            <span className="block text-muted-foreground">{w.romaji}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function VocabularyGroups({ section }: { section: Data }) {
  return (
    <SectionShell eyebrow="Vocabulary" title={section.title}>
      <div className="space-y-8">
        {section.data.groups.map((g, i) => (
          <div key={i}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-display text-base text-foreground">{g.theme}</h3>
              <ReportButton
                sectionType="vocabulary_groups"
                itemType="vocabulary_group"
                itemId={g.theme ?? String(i)}
                label={g.theme ?? `Group ${i + 1}`}
                snapshot={g}
              />
            </div>
            <VocabTable words={g.words} />
            <VocabFlashcards words={g.words} label={g.theme} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
