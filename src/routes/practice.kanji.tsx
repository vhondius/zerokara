import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KanjiPractice } from "@/components/practice/KanjiPractice";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/practice/kanji")({
  head: () => ({
    meta: [
      { title: "Kanji practice — flashcards, quizzes, stroke tracing" },
      {
        name: "description",
        content:
          "Drill every kanji introduced in the Kanji Lessons with flashcards, meaning quizzes, spaced review, and animated stroke order.",
      },
      { property: "og:title", content: "Kanji practice" },
      {
        property: "og:description",
        content:
          "Flashcards, quizzes, SRS review, and stroke tracing for every kanji introduced across the course.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "/practice/kanji" },
    ],
    links: [{ rel: "canonical", href: "/practice/kanji" }],
  }),
  component: KanjiRoute,
});

function KanjiRoute() {
  // Client-only: shuffle, stroke tracer, and localStorage progress reads.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-muted-foreground">
        Loading practice…
      </div>
    );
  }
  return (
    <ColorScope color={SECTION_COLORS.kanji}>
      <KanjiPractice />
    </ColorScope>
  );
}
