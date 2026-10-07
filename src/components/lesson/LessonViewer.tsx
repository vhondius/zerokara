import { useEffect, useRef, useState } from "react";
import type { Section, Unit } from "@/content/schema";
import { CultureClip } from "./sections/CultureClip";
import { CoolTools } from "./sections/CoolTools";
import { Grammar } from "./sections/Grammar";
import { SpeakingNaturally } from "./sections/SpeakingNaturally";
import { WordUsage } from "./sections/WordUsage";
import { SpecialUsage } from "./sections/SpecialUsage";
import { NewAdjectives } from "./sections/NewAdjectives";
import { KanaIntro } from "./sections/KanaIntro";
import { WritingPoints } from "./sections/WritingPoints";
import { VocabularyGroups } from "./sections/VocabularyGroups";
import { LessonActivities, UnitDoneBanner, useJustCompleted } from "./sections/LessonActivities";
import { SentenceBuilding } from "./sections/SentenceBuilding";
import { UnitProvider } from "./unit-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { isNativePlatform } from "@/lib/notifications";
import { useUnitProgress } from "@/hooks/use-unit-progress";

function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case "culture_clip":
      return <CultureClip section={section} />;
    case "cool_tools":
      return <CoolTools section={section} />;
    case "grammar":
      return <Grammar section={section} />;
    case "speaking_naturally":
      return <SpeakingNaturally section={section} />;
    case "word_usage":
      return <WordUsage section={section} />;
    case "special_usage":
      return <SpecialUsage section={section} />;
    case "new_adjectives":
      return <NewAdjectives section={section} />;
    case "kana_intro":
      return <KanaIntro section={section} />;
    case "writing_points":
      return <WritingPoints section={section} />;
    case "vocabulary_groups":
      return <VocabularyGroups section={section} />;
    case "lesson_activities":
      return <LessonActivities section={section} />;
    case "sentence_building":
      return <SentenceBuilding section={section} />;
    // Answers are now shown inline on each exercise as you submit it, so the
    // standalone answer-key section is intentionally not rendered.
    case "answer_key":
      return null;
  }
}

const stripLabel: Record<Section["type"], string | null> = {
  culture_clip: "Culture",
  cool_tools: "Cool tools",
  grammar: "Grammar",
  speaking_naturally: "Speaking",
  word_usage: "Word usage",
  special_usage: "Special usage",
  new_adjectives: "Adjectives",
  kana_intro: "Kana",
  writing_points: "Writing",
  vocabulary_groups: "Vocabulary",
  lesson_activities: "Workbook",
  sentence_building: "Sentence building",
  answer_key: null,
};

const labelFor = (s: Section) =>
  s.type === "kana_intro" && s.data.script === "kanji" ? "Kanji" : stripLabel[s.type];

export function LessonViewer({ bookId, unit }: { bookId: string; unit: Unit }) {
  const allExerciseIds = unit.sections.flatMap((s) =>
    s.type === "lesson_activities" ? s.data.exercises.map((e) => e.id) : [],
  );
  const hydrated = useHydrated();
  const shown = unit.sections.flatMap((section, index) =>
    labelFor(section) ? [{ section, index }] : [],
  );
  return (
    <UnitProvider value={{ bookId, unit, allExerciseIds }}>
      {/* Web only: on the phone app the strip is more clutter than help. */}
      {hydrated && !isNativePlatform() && shown.length > 2 ? <SectionStrip shown={shown} /> : null}
      <div className="space-y-6">
        {shown.map(({ section, index }) => (
          <div key={index} id={`section-${index}`} data-index={index} className="scroll-mt-32">
            <SectionRenderer section={section} />
          </div>
        ))}
        {allExerciseIds.length === 0 ? <MarkAsRead /> : <DoneAtEnd />}
      </div>
    </UnitProvider>
  );
}

function DoneAtEnd() {
  return useJustCompleted() ? <UnitDoneBanner /> : null;
}

/**
 * Sticky "where am I" strip under the top bar: one chip per section, the one
 * in view marked, the workbook with its answered count. Tapping jumps there.
 */
function SectionStrip({ shown }: { shown: { section: Section; index: number }[] }) {
  const { results } = useUnitProgress();
  const [active, setActive] = useState(shown[0]?.index ?? 0);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      // A thin band just under the sticky bars decides which section is "current".
      { rootMargin: "-130px 0px -70% 0px" },
    );
    for (const { index } of shown) {
      const el = document.getElementById(`section-${index}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [shown]);

  // Keep the active chip visible inside the strip without moving the page.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (el && strip.current)
      strip.current.scrollTo({
        left: el.offsetLeft - (strip.current.clientWidth - el.clientWidth) / 2,
        behavior: "smooth",
      });
  }, [active]);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-[4.25rem] z-30 -mx-6 mb-6 border-b border-border/70 bg-background/90 shadow-float backdrop-blur"
    >
      <div ref={strip} className="flex gap-1 overflow-x-auto px-6 py-2 [scrollbar-width:none]">
        {shown.map(({ section, index }) => {
          const count =
            section.type === "lesson_activities"
              ? ` ${section.data.exercises.filter((e) => results[e.id]).length}/${section.data.exercises.length}`
              : "";
          const on = index === active;
          return (
            <button
              key={index}
              type="button"
              data-chip={index}
              aria-current={on ? "true" : undefined}
              onClick={() =>
                document
                  .getElementById(`section-${index}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {labelFor(section)}
              {count ? <span className="tabular-nums opacity-80">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Completion control for reading-only units, which have no exercises to answer. */
function MarkAsRead() {
  const { hydrated, completed, markRead } = useUnitProgress();
  if (!hydrated) return null;
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center">
      {completed ? (
        <p className="text-sm text-muted-foreground">✓ Marked as read.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            This unit has no exercises. Mark it as read when you're done.
          </p>
          <button
            type="button"
            onClick={markRead}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Mark as read
          </button>
        </>
      )}
    </div>
  );
}
