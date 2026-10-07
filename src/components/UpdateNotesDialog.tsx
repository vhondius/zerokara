import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CHANGELOG, newestChangelogId, type ChangelogEntry } from "@/lib/changelog";
import { getLastSeenChangelogId, setLastSeenChangelogId } from "@/lib/update-log";

/**
 * Shows changelog entries the user hasn't seen yet, once per app load, after
 * a real update (not on first-ever install — there's nothing to compare
 * against then, so it just silently records the current changelog id).
 */
export function UpdateNotesDialog() {
  const [mounted, setMounted] = useState(false);
  const [unseen, setUnseen] = useState<ChangelogEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lastSeen = getLastSeenChangelogId();
    if (lastSeen === null) {
      setLastSeenChangelogId(newestChangelogId());
      return;
    }
    const toShow = CHANGELOG.filter((e) => e.id > lastSeen);
    if (toShow.length > 0) {
      setUnseen(toShow);
      setOpen(true);
    }
  }, []);

  const close = () => {
    setLastSeenChangelogId(newestChangelogId());
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
      onClick={close}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-held"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg text-foreground">What's new</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {unseen.map((entry) => (
            <div key={entry.id}>
              <p className="text-xs text-muted-foreground">{entry.date}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                {entry.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
