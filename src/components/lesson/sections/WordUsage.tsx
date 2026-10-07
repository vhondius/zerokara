import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { ExampleRow, Prose, SectionShell } from "./shared";

type Data = Extract<Section, { type: "word_usage" }>;

export function WordUsage({ section }: { section: Data }) {
  const { body, examples, notes } = section.data;
  return (
    <SectionShell eyebrow="Word usage" title={section.title}>
      {body ? <Prose>{body}</Prose> : null}
      {notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((n) => (
            <div key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base text-foreground">{n.title}</h3>
                <ReportButton
                  sectionType="word_usage"
                  itemType="usage_note"
                  itemId={n.id}
                  label={n.title}
                  snapshot={n}
                />
              </div>
              <Prose>{n.body}</Prose>
            </div>
          ))}
        </div>
      ) : null}
      {examples.length > 0 ? (
        <div className="space-y-2">
          {examples.map((e, i) => (
            <ExampleRow key={i} {...e} />
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}
