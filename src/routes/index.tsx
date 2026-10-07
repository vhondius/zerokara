import { Link, createFileRoute } from "@tanstack/react-router";
import { FirstRunCard, TodayCard } from "@/components/home/TodayCard";

const TITLE = "Zerokara — a personal Japanese From Zero study companion";
const DESC =
  "Grammar and hiragana in the order the book teaches them, plus standalone flashcards, quizzes, and stroke tracing for kana and kanji.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="jp text-accent">ゼロカラ</span>
        <span>· personal study companion</span>
      </div>
      <h1 className="mt-6 font-display text-5xl leading-tight text-foreground md:text-6xl">
        Learn Japanese, in the order the book teaches it.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
        Grammar points introduced one at a time. Hiragana in small groups, alongside the grammar
        that uses it. And whenever you feel like drilling, kana and kanji practice are one click
        away.
      </p>

      <FirstRunCard />
      <TodayCard />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          to="/learn"
          className="group rounded-xl border border-border bg-card shadow-sheet p-6 transition-[border-color,box-shadow,translate] hover:border-accent hover:shadow-lift active:translate-y-px"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-foreground">Course</h2>
            <span className="jp text-3xl text-accent">課</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Work through pre-lessons and lessons in order. Grammar, culture, writing, vocabulary,
            and workbook exercises for each unit.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-accent group-hover:underline">
            Start learning →
          </span>
        </Link>

        <Link
          to="/practice"
          className="group rounded-xl border border-border bg-card shadow-sheet p-6 transition-[border-color,box-shadow,translate] hover:border-accent hover:shadow-lift active:translate-y-px"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-foreground">Practice</h2>
            <span className="jp text-3xl text-accent">練</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Standalone drills for hiragana, katakana, and kanji. Flashcards, stroke order, and
            quizzes — usable independently of your course progress.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-accent group-hover:underline">
            Open practice →
          </span>
        </Link>
      </div>
    </div>
  );
}
