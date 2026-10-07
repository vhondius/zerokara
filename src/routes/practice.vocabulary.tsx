import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { VocabularyPractice } from "@/components/practice/VocabularyPractice";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/practice/vocabulary")({
  head: () => ({
    meta: [
      { title: "Vocabulary practice — flashcards and quizzes" },
      {
        name: "description",
        content:
          "Drill every vocabulary word taught across the course with flashcards and typed quizzes, filtered by book or by what you've studied.",
      },
      { property: "og:title", content: "Vocabulary practice" },
      {
        property: "og:description",
        content: "Flashcards and quizzes for every vocabulary word introduced across the course.",
      },
      { property: "og:url", content: "/practice/vocabulary" },
    ],
    links: [{ rel: "canonical", href: "/practice/vocabulary" }],
  }),
  component: VocabularyRoute,
});

function VocabularyRoute() {
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
    <ColorScope color={SECTION_COLORS.reference}>
      <VocabularyPractice />
    </ColorScope>
  );
}
