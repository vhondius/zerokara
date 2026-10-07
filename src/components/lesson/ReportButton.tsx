import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getBook } from "@/content/registry";
import { addFaultReport } from "@/lib/fault-log";
import { useUnitContextOptional } from "./unit-context";
import { useTheme } from "@/components/theme/ThemeProvider";

export type ReportTarget = {
  /** Section type, e.g. "grammar" | "vocabulary_groups". */
  sectionType: string;
  /** Item type, e.g. "grammar_point" | "vocabulary_word". */
  itemType: string;
  /** Specific id/index within the section. */
  itemId: string;
  /** Short human label shown in the modal header. */
  label: string;
  /** Full JSON snapshot of the reported content. */
  snapshot: unknown;
  /**
   * Explicit book/unit context — required when rendered outside a
   * LessonViewer/UnitProvider tree (e.g. practice screens). Falls back to
   * useUnitContext() when omitted.
   */
  context?: { bookId: string; unitId: string; unitLabel: string; unitTitle: string };
};

export function ReportButton(props: ReportTarget & { className?: string }) {
  const [open, setOpen] = useState(false);
  const { reportButtons } = useTheme();
  const { className = "", ...target } = props;
  // Off by default so study screens stay quiet; switched on in Settings for content QA.
  if (!reportButtons) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Report an error in this content."
        aria-label="Report an error in this content."
        className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold after:absolute after:-inset-2.5 after:content-[''] leading-none text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive ${className}`}
      >
        !
      </button>
      {open ? <ReportModal target={target} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReportModal({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const unitCtx = useUnitContextOptional();
  const ctx =
    target.context ??
    (unitCtx
      ? {
          bookId: unitCtx.bookId,
          unitId: unitCtx.unit.id,
          unitLabel: unitCtx.unit.label,
          unitTitle: unitCtx.unit.title,
        }
      : null);
  const [comment, setComment] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined" || !ctx) return null;

  const submit = () => {
    const saved = addFaultReport({
      book_id: ctx.bookId,
      book_title: getBook(ctx.bookId)?.title ?? ctx.bookId,
      unit_id: ctx.unitId,
      unit_label: ctx.unitLabel,
      unit_title: ctx.unitTitle,
      section_type: target.sectionType,
      item_type: target.itemType,
      item_id: target.itemId,
      item_snapshot: target.snapshot,
      user_comment: comment.trim(),
    });
    if (!saved) {
      toast.error("Couldn't save the report: storage is full. Clear the fault log in Settings.");
      return;
    }
    toast.success("Report saved on this device");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report an error"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-held"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg text-foreground">Report an error</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ctx.unitLabel} · {ctx.unitTitle} — {target.sectionType.replace(/_/g, " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Reporting</div>
          <div className="jp mt-1 text-sm font-medium text-foreground">{target.label}</div>
          <pre className="jp mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
            {JSON.stringify(target.snapshot, null, 2)}
          </pre>
        </div>

        <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="fault-comment">
          What's wrong?
        </label>
        <textarea
          id="fault-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Describe the mistake so you can fix it later."
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Submit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
