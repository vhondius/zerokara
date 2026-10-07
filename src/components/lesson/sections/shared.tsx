import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  // The category ("Culture", "Workbook") is the heading unless the content
  // gives a real title, in which case it stays as a quiet label above it.
  const heading = title ?? eyebrow;
  const category = title && title !== eyebrow ? eyebrow : null;
  return (
    <section className="rounded-xl border border-border bg-card shadow-sheet p-6">
      {category ? (
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{category}</p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 font-display text-2xl text-foreground">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-start gap-2 text-left"
          >
            <span>{heading}</span>
            <ChevronDown
              aria-hidden
              className={`mt-1.5 size-5 shrink-0 text-muted-foreground transition-transform ${
                open ? "" : "-rotate-90"
              }`}
            />
          </button>
        </h2>
        {action ? <div className="mt-1 shrink-0">{action}</div> : null}
      </div>
      {/* Hidden rather than unmounted, so half-typed answers survive a collapse. */}
      <div hidden={!open} className="mt-4 space-y-4 text-foreground/90">
        {children}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="leading-relaxed text-foreground/90">{children}</div>;
}

export function ExampleRow({
  japanese,
  romaji,
  english,
}: {
  japanese: string;
  romaji: string;
  english: string;
}) {
  return (
    <div className="grid gap-1 rounded-md bg-muted/50 px-4 py-3 md:grid-cols-[1fr_1fr_1fr] md:items-baseline md:gap-6">
      <span className="jp text-lg text-foreground">{japanese}</span>
      {/* Book 1's pre-lessons come before hiragana, so their examples are romaji only. */}
      {romaji.trim() !== japanese.trim() ? (
        <span className="text-sm text-muted-foreground">{romaji}</span>
      ) : (
        <span className="hidden md:block" />
      )}
      <span className="text-sm text-foreground/80">{english}</span>
    </div>
  );
}
