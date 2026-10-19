import { createFileRoute } from "@tanstack/react-router";
import { ReviewPractice } from "@/components/practice/ReviewPractice";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review — Spaced repetition" },
      {
        name: "description",
        content:
          "Anki-style spaced review for vocabulary, hiragana, and katakana you've already learned.",
      },
      { property: "og:title", content: "Review — Spaced repetition" },
      {
        property: "og:description",
        content:
          "Anki-style spaced review for vocabulary, hiragana, and katakana you've already learned.",
      },
      { property: "og:url", content: "/review" },
    ],
    links: [{ rel: "canonical", href: "/review" }],
  }),
  component: ReviewPractice,
});
