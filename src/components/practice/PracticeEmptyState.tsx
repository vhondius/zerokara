import { Link } from "@tanstack/react-router";

export function PracticeEmptyState({
  script,
  jp,
  note,
}: {
  script: string;
  jp: string;
  note: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/practice"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All practice
      </Link>
      <div className="mt-6 flex items-baseline gap-4">
        <span className="jp text-5xl text-accent">{jp}</span>
        <h1 className="font-display text-4xl text-foreground">{script}</h1>
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="font-display text-xl text-foreground">Drills arrive in Phase 3</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{note}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Once course content is seeded, characters introduced by units will feed flashcards,
          recognition quizzes, stroke-order playback, and spaced review here.
        </p>
      </div>
    </div>
  );
}
