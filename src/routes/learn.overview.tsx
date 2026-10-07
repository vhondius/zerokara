import { useEffect, useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { books, orderedUnits, previousBook } from "@/content/registry";
import type { Book } from "@/content/schema";
import { useProgressTick } from "@/hooks/use-unit-progress";
import { getUnitProgress, isBookTestPassed } from "@/lib/progress-store";
import { ColorBlock } from "@/components/theme/ColorScope";
import { useTheme } from "@/components/theme/ThemeProvider";
import { bookColor, bookGradient, obiFor } from "@/lib/theme-colors";
import { BookLockedDialog } from "@/components/learn/BookLockedDialog";
import { bookStatus, currentBook } from "@/lib/book-progress";

export const Route = createFileRoute("/learn/overview")({
  head: () => {
    const courseJsonLd = books.map((book) => {
      const units = orderedUnits(book);
      return {
        "@context": "https://schema.org",
        "@type": "Course",
        name: book.title,
        description: `Personal study path following ${book.title}: ${units.length} units of grammar and hiragana taught in the book's order.`,
        inLanguage: "en",
        teaches: "Japanese",
        educationalLevel: `Level ${book.level}`,
        provider: {
          "@type": "Organization",
          name: "Zerokara — Personal Study",
        },
        author: book.authors.map((name) => ({ "@type": "Person", name })),
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: `PT${units.length}H`,
        },
        syllabusSections: units.map((u) => ({
          "@type": "Syllabus",
          name: `${u.label}: ${u.title}`,
        })),
      };
    });
    return {
      meta: [
        { title: "Course overview — Japanese From Zero" },
        {
          name: "description",
          content:
            "Every pre-lesson and lesson across the course, in book order, with your completion state and book tests.",
        },
        { property: "og:title", content: "Course overview — Japanese From Zero" },
        {
          property: "og:description",
          content:
            "Browse all books and units: grammar, hiragana, vocabulary, workbook exercises, and end-of-book tests.",
        },
        { property: "og:url", content: "/learn/overview" },
      ],
      links: [{ rel: "canonical", href: "/learn/overview" }],
      scripts: courseJsonLd.map((data) => ({
        type: "application/ld+json",
        children: JSON.stringify(data),
      })),
    };
  },
  component: LearnOverview,
});

function LearnOverview() {
  const { hydrated } = useProgressTick();
  const { color: colorOn, dark, hydrated: themeReady } = useTheme();
  const gradientOn = themeReady && colorOn;
  const [lockedBook, setLockedBook] = useState<Book | null>(null);
  // The top bar takes the gradient's colour at the point just below it, so
  // it blends from book to book in step with the scroll, like the page does.
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gradientOn) return;
    const root = document.documentElement;
    const stops = books.map((b) => bookColor(b.id));
    let frame = 0;
    const paint = () => {
      frame = 0;
      const el = page.current;
      if (!el) return;
      const barBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const r = el.getBoundingClientRect();
      // Same geometry as bookGradient: stops spread evenly down the page.
      const t = Math.min(1, Math.max(0, (barBottom - r.top) / r.height)) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(t));
      const mixed = `color-mix(in oklab, ${stops[i + 1]} ${((t - i) * 100).toFixed(1)}%, ${stops[i]})`;
      root.style.setProperty("--obi", obiFor(mixed, dark));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.style.removeProperty("--obi");
    };
  }, [gradientOn, dark]);

  // Open on the book the learner is working through, not always Book 1.
  useEffect(() => {
    if (!hydrated) return;
    const current = currentBook();
    if (!current || current.id === books[0].id) return;
    document.getElementById(`book-${current.id}`)?.scrollIntoView({ block: "start" });
  }, [hydrated]);

  return (
    <div
      ref={page}
      className="min-h-[calc(100vh-65px)]"
      style={
        gradientOn
          ? {
              backgroundImage: `var(--paper-texture), ${bookGradient(books.map((b) => b.id))}`,
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl text-foreground">Course overview</h1>
          <Link
            to="/learn"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Resume where I left off →
          </Link>
        </div>
        <p className="mt-2 text-muted-foreground">
          All five Japanese From Zero books, unit by unit in the order the books teach them.
        </p>

        <div className="mt-10 space-y-10">
          {books.map((book) => {
            const units = orderedUnits(book);
            const bookComplete =
              hydrated &&
              units.length > 0 &&
              units.every((u) => !!getUnitProgress(book.id, u.id)?.completed);
            const prev = previousBook(book.id);
            const locked = hydrated && !!prev && !isBookTestPassed(prev.id);
            // "You are here": the next unit to study in the book being worked through.
            const upNext =
              hydrated && currentBook()?.id === book.id
                ? bookStatus(book).firstIncomplete?.id
                : undefined;
            return (
              <ColorBlock key={book.id} color={bookColor(book.id)} className="rounded-2xl">
                <section id={`book-${book.id}`} className="scroll-mt-20">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-2xl text-foreground">{book.title}</h2>
                    <span className="text-xs text-muted-foreground">Level {book.level}</span>
                  </div>

                  {units.length === 0 ? (
                    <EmptyBook />
                  ) : (
                    <>
                      <ol className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sheet">
                        {units.map((u) => {
                          const complete = hydrated && !!getUnitProgress(book.id, u.id)?.completed;
                          const isNext = u.id === upNext;
                          const rowContent = (
                            <>
                              <div className="flex items-center gap-3">
                                <div>
                                  <div
                                    className={`text-xs uppercase tracking-widest ${
                                      isNext ? "font-medium text-accent" : "text-muted-foreground"
                                    }`}
                                  >
                                    {u.label}
                                    {isNext ? " · Up next" : null}
                                  </div>
                                  <div className="mt-1 font-medium text-foreground">{u.title}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {locked ? (
                                  <Lock aria-label="Locked" className="size-4" />
                                ) : complete ? (
                                  <Check
                                    aria-label="Completed"
                                    className="size-4 text-foreground"
                                  />
                                ) : null}
                                {!locked ? (
                                  <span className="text-sm text-muted-foreground">→</span>
                                ) : null}
                              </div>
                            </>
                          );
                          return (
                            <li key={u.id}>
                              {locked ? (
                                <button
                                  type="button"
                                  onClick={() => setLockedBook(book)}
                                  className="flex w-full items-center justify-between px-5 py-4 text-left text-muted-foreground transition-colors hover:bg-muted/50"
                                >
                                  {rowContent}
                                </button>
                              ) : (
                                <Link
                                  to="/learn/$bookId/$unitId"
                                  params={{ bookId: book.id, unitId: u.id }}
                                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/50"
                                >
                                  {rowContent}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ol>

                      <div className="mt-3">
                        {bookComplete ? (
                          <Link
                            to="/learn/$bookId/test"
                            params={{ bookId: book.id }}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card shadow-sheet px-4 py-3 text-sm text-foreground transition-colors hover:border-foreground/40"
                          >
                            <span className="font-medium">Take the Book Test</span>
                            <span className="text-muted-foreground">
                              — a random 15% sample of every lesson
                            </span>
                          </Link>
                        ) : !locked ? (
                          <Link
                            to="/learn/$bookId/test"
                            params={{ bookId: book.id }}
                            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                          >
                            <span className="font-medium">Book Test</span>
                            <span>— finish the book first, or test out if you already know it</span>
                          </Link>
                        ) : (
                          <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                            Book Test locked — pass the previous book's test first.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </ColorBlock>
            );
          })}
        </div>
      </div>

      {lockedBook ? (
        <BookLockedDialog book={lockedBook} onClose={() => setLockedBook(null)} />
      ) : null}
    </div>
  );
}

function EmptyBook() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="font-display text-lg text-foreground">Not available yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This book's lessons haven't been added to the app yet.
      </p>
    </div>
  );
}
