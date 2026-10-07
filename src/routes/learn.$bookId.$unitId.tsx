import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { getBook, getUnit, orderedUnits, previousBook } from "@/content/registry";
import { LessonViewer } from "@/components/lesson/LessonViewer";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProgressTick } from "@/hooks/use-unit-progress";
import { getUnitProgress, isBookTestPassed } from "@/lib/progress-store";
import { ColorScope } from "@/components/theme/ColorScope";
import { bookColor } from "@/lib/theme-colors";
import { BookLockedDialog } from "@/components/learn/BookLockedDialog";

export const Route = createFileRoute("/learn/$bookId/$unitId")({
  loader: ({ params }) => {
    const book = getBook(params.bookId);
    const unit = getUnit(params.bookId, params.unitId);
    if (!book || !unit) throw notFound();
    return { book, unit };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Unit not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const { book, unit } = loaderData;
    const title = `${unit.label}: ${unit.title} — ${book.title}`;
    const kind =
      unit.type === "pre-lesson"
        ? "Pre-lesson"
        : unit.type === "kanji-lesson"
          ? "Kanji lesson"
          : "Lesson";
    const desc = `${kind} ${unit.label}: ${unit.title}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/learn/${book.id}/${unit.id}` },
      ],
      links: [{ rel: "canonical", href: `/learn/${book.id}/${unit.id}` }],
    };
  },
  component: UnitPage,
  notFoundComponent: UnitNotFound,
});

function UnitPage() {
  const { book, unit } = Route.useLoaderData();
  const chain = orderedUnits(book);
  const idx = chain.findIndex((u) => u.id === unit.id);
  const prev = idx > 0 ? chain[idx - 1] : undefined;
  const next = idx >= 0 && idx < chain.length - 1 ? chain[idx + 1] : undefined;

  useProgressTick(); // re-render on progress changes
  const hydrated = useHydrated();
  const currentComplete = hydrated ? !!getUnitProgress(book.id, unit.id)?.completed : false;
  const nextIsAhead = !currentComplete;

  const prevBook = previousBook(book.id);
  const locked = hydrated && !!prevBook && !isBookTestPassed(prevBook.id);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  useEffect(() => {
    if (locked) setShowLockedDialog(true);
  }, [locked]);

  return (
    <>
      <ColorScope color={bookColor(book.id)}>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            to="/learn/overview"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Course overview
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {book.title} · {unit.label}
            </div>

            {currentComplete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
                <Check aria-hidden className="size-3" /> Complete
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-4xl text-foreground">{unit.title}</h1>

          <div className="mt-10">
            {locked ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
                <p className="font-display text-lg text-foreground">{book.title} is locked</p>
                <p className="mt-2 text-sm">
                  Pass {prevBook!.title}'s book test before moving on to {book.title}.
                </p>
              </div>
            ) : unit.sections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
                This unit has no sections yet.
              </div>
            ) : (
              <LessonViewer bookId={book.id} unit={unit} />
            )}
          </div>

          {locked ? null : (
            <nav className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm">
              {prev ? (
                <Link
                  to="/learn/$bookId/$unitId"
                  params={{ bookId: book.id, unitId: prev.id }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← {prev.label}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  to="/learn/$bookId/$unitId"
                  params={{ bookId: book.id, unitId: next.id }}
                  className={
                    nextIsAhead
                      ? "text-muted-foreground hover:text-foreground"
                      : "font-medium text-foreground underline-offset-4 hover:underline"
                  }
                  title={nextIsAhead ? "You haven't finished this unit yet" : undefined}
                >
                  {next.label} →
                </Link>
              ) : (
                <Link
                  to="/learn/$bookId/test"
                  params={{ bookId: book.id }}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Book test →
                </Link>
              )}
            </nav>
          )}
        </div>
      </ColorScope>

      {showLockedDialog && prevBook ? (
        <BookLockedDialog book={book} onClose={() => setShowLockedDialog(false)} />
      ) : null}
    </>
  );
}

function UnitNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-foreground">Unit not found</h1>
      <p className="mt-2 text-muted-foreground">That book or unit isn't in the content registry.</p>
      <Link to="/learn" className="mt-6 inline-block text-accent hover:underline">
        Back to the course
      </Link>
    </div>
  );
}
