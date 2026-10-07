import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { Prose, SectionShell } from "./shared";

type Data = Extract<Section, { type: "cool_tools" }>;

export function CoolTools({ section }: { section: Data }) {
  return (
    <SectionShell
      eyebrow="Cool tools"
      title={section.title}
      action={
        <ReportButton
          sectionType="cool_tools"
          itemType="cool_tools"
          itemId={section.title ?? "cool_tools"}
          label={section.title ?? "Cool tools"}
          snapshot={{ title: section.title, body: section.data.body }}
        />
      }
    >
      <Prose>{section.data.body}</Prose>
    </SectionShell>
  );
}
