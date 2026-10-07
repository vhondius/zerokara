import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import type { Book } from "@/content/schema";
import { bookStatus, currentBook } from "@/lib/book-progress";

/**
 * Explains why a book is inaccessible: its predecessor's test hasn't been
 * passed yet. Points at the book the learner is actually in (the first one
 * whose test isn't passed), so it never sends them to another locked page. Follows the hand-rolled modal pattern used by
 * UpdateNotesDialog rather than the (unused elsewhere) shadcn dialog
 * scaffold, to match what's actually in use in this app.
 */
export function BookLockedDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const current = currentBook();
  const status = current ? bookStatus(current) : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Book locked"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-held"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg text-foreground">{book.title} is locked</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Each book opens once you pass the previous book's test.
          {current ? (
            <>
              {" "}
              You're working through {current.title}: {status!.done} of {status!.units.length} units
              done. Finish it and take its test, or test out of it now if you already know the
              material.
            </>
          ) : null}
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            Close
          </button>
          {current ? (
            <>
              <Link
                to="/learn/$bookId/test"
                params={{ bookId: current.id }}
                onClick={onClose}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
              >
                {status!.firstIncomplete ? `Test out of ${current.title}` : "Take the Book Test"}
              </Link>
              {status!.firstIncomplete ? (
                <Link
                  to="/learn/$bookId/$unitId"
                  params={{ bookId: current.id, unitId: status!.firstIncomplete.id }}
                  onClick={onClose}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue {current.title}
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
