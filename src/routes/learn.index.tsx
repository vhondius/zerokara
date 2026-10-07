import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { books, orderedUnits } from "@/content/registry";
import { useHydrated } from "@/hooks/use-hydrated";
import { getState } from "@/lib/progress-store";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Continue studying — Japanese From Zero" },
      {
        name: "description",
        content:
          "Jump straight back into the lesson you were last working on, or browse the full course overview.",
      },
      { property: "og:title", content: "Continue studying — Japanese From Zero" },
      {
        property: "og:description",
        content: "Resume the most recent lesson in your Japanese From Zero study path.",
      },
      { property: "og:url", content: "/learn" },
    ],
    links: [{ rel: "canonical", href: "/learn" }],
  }),
  component: LearnResume,
});

/** First unit of the first book that has any units. */
function firstUnit(): { bookId: string; unitId: string } | null {
  for (const book of books) {
    const units = orderedUnits(book);
    if (units.length > 0) return { bookId: book.id, unitId: units[0].id };
  }
  return null;
}

/**
 * Most recently touched unit: the unit holding the newest exercise timestamp.
 * Falls back to the first incomplete unit, then to the very first unit.
 */
function resumeTarget(): { bookId: string; unitId: string } | null {
  const state = getState();
  let best: { key: string; at: string } | null = null;
  for (const [key, up] of Object.entries(state.units)) {
    for (const r of Object.values(up?.exercise_results ?? {})) {
      if (!r?.at) continue;
      if (!best || r.at > best.at) best = { key, at: r.at };
    }
  }
  if (best) {
    const [bookId, unitId] = best.key.split(":");
    const book = books.find((b) => b.id === bookId);
    const units = book ? orderedUnits(book) : [];
    const idx = units.findIndex((u) => u.id === unitId);
    if (idx >= 0) {
      const done = !!state.units[best.key]?.completed;
      // Finished that unit? Move on to the next one.
      const target = done && idx < units.length - 1 ? units[idx + 1] : units[idx];
      return { bookId, unitId: target.id };
    }
  }
  return firstUnit();
}

function LearnResume() {
  const hydrated = useHydrated();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    const target = resumeTarget();
    if (target) {
      navigate({
        to: "/learn/$bookId/$unitId",
        params: target,
        replace: true,
      });
    }
  }, [hydrated, navigate]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-foreground">Picking up where you left off…</h1>
      <p className="mt-2 text-sm text-muted-foreground">Taking you to your current lesson.</p>
      <Link to="/learn/overview" className="mt-6 inline-block text-accent hover:underline">
        Course overview
      </Link>
    </div>
  );
}
