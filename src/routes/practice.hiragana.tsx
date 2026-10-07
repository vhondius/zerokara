import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HiraganaPractice } from "@/components/practice/HiraganaPractice";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/practice/hiragana")({
  validateSearch: (search: Record<string, unknown>): { chars?: string } => ({
    chars: typeof search.chars === "string" ? search.chars : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Hiragana practice — flashcards, quizzes, stroke tracing" },
      {
        name: "description",
        content:
          "Drill hiragana with flashcards, timed quizzes, spaced-repetition review, and animated stroke-order tracing.",
      },
      { property: "og:title", content: "Hiragana practice" },
      {
        property: "og:description",
        content:
          "Flashcards, quizzes, SRS review, and stroke tracing for every hiragana introduced across the course.",
      },
      { property: "og:url", content: "/practice/hiragana" },
    ],
    links: [{ rel: "canonical", href: "/practice/hiragana" }],
  }),
  component: HiraganaRoute,
});

function HiraganaRoute() {
  // Client-only render: flashcard shuffle + stroke tracer both need the DOM,
  // and reading completed units from localStorage would hydration-mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { chars } = Route.useSearch();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-muted-foreground">
        Loading practice…
      </div>
    );
  }
  return (
    <ColorScope color={SECTION_COLORS.hiragana}>
      <HiraganaPractice initialChars={chars} />
    </ColorScope>
  );
}
