import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { KatakanaPractice } from "@/components/practice/KatakanaPractice";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";
import { PracticeEmptyState } from "@/components/practice/PracticeEmptyState";
import { allKatakana } from "@/lib/kana-index";

export const Route = createFileRoute("/practice/katakana")({
  validateSearch: (search: Record<string, unknown>): { chars?: string } => ({
    chars: typeof search.chars === "string" ? search.chars : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Katakana practice — flashcards, quizzes, stroke tracing" },
      {
        name: "description",
        content:
          "Drill katakana with flashcards, quizzes, spaced-repetition review, and animated stroke-order tracing.",
      },
      { property: "og:title", content: "Katakana practice" },
      {
        property: "og:description",
        content:
          "Flashcards, quizzes, SRS review, and stroke tracing for every katakana introduced across the course.",
      },
      { property: "og:url", content: "/practice/katakana" },
    ],
    links: [{ rel: "canonical", href: "/practice/katakana" }],
  }),
  component: KatakanaRoute,
});

function KatakanaRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hasContent = useMemo(() => allKatakana().length > 0, []);
  const { chars } = Route.useSearch();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-muted-foreground">
        Loading practice…
      </div>
    );
  }
  if (!hasContent) {
    return (
      <PracticeEmptyState
        script="Katakana"
        jp="カタカナ"
        note="Katakana hasn't been introduced yet in the seeded content."
      />
    );
  }
  return (
    <ColorScope color={SECTION_COLORS.katakana}>
      <KatakanaPractice initialChars={chars} />
    </ColorScope>
  );
}
