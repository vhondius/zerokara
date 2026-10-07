import type { Section } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { Prose, SectionShell } from "./shared";

type Data = Extract<Section, { type: "culture_clip" }>;

export function CultureClip({ section }: { section: Data }) {
  return (
    <SectionShell
      eyebrow="Culture"
      title={section.title}
      action={
        <ReportButton
          sectionType="culture_clip"
          itemType="culture_clip"
          itemId={section.title ?? "culture_clip"}
          label={section.title ?? "Culture clip"}
          snapshot={{ title: section.title, body: section.data.body }}
        />
      }
    >
      <Prose>{section.data.body}</Prose>
    </SectionShell>
  );
}
