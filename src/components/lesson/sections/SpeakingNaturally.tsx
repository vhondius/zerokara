import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";

type Data = Extract<Section, { type: "speaking_naturally" }>;

export function SpeakingNaturally({ section }: { section: Data }) {
  return (
    <SectionShell eyebrow="Speaking naturally" title={section.title}>
      <div className="space-y-4">
        {section.data.notes.map((n) => (
          <article key={n.id}>
            <div className="flex items-baseline gap-3">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {n.id}
              </span>
              <h3 className="font-display text-base text-foreground">{n.title}</h3>
              <span className="ml-auto">
                <ReportButton
                  sectionType="speaking_naturally"
                  itemType="speaking_note"
                  itemId={n.id}
                  label={n.title}
                  snapshot={n}
                />
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{n.body}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
