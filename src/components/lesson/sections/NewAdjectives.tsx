import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { SectionShell } from "./shared";
import { VocabTable } from "./VocabularyGroups";

type Data = Extract<Section, { type: "new_adjectives" }>;

export function NewAdjectives({ section }: { section: Data }) {
  return (
    <SectionShell
      eyebrow="New adjectives"
      title={section.title}
      action={
        <ReportButton
          sectionType="new_adjectives"
          itemType="adjective_list"
          itemId={section.title ?? "new_adjectives"}
          label={section.title ?? "New adjectives"}
          snapshot={section.data}
        />
      }
    >
      <VocabTable words={section.data.words} />
    </SectionShell>
  );
}
