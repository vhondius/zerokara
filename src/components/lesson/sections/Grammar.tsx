import type { Section, VerbTable } from "@/content/schema";
import { ReportButton } from "../ReportButton";
import { ExampleRow, SectionShell } from "./shared";

type Data = Extract<Section, { type: "grammar" }>;

/**
 * form_name values are open-ended (books use different form sets), so map the
 * known Japanese stems to their kana names first, then title-case the rest.
 */
const STEMS: [RegExp, string][] = [
  [/^te_form/, "て-form"],
  [/^teiru/, "ています"],
  [/^tai/, "たい-form"],
  [/^ta_form/, "た-form"],
  [/^potential/, "Potential"],
  [/^masu/, "ます-form"],
];

function humanForm(name: string): string {
  for (const [re, label] of STEMS) {
    if (re.test(name)) {
      const rest = name.replace(re, "").replace(/^_/, "");
      const suffix = rest.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return suffix ? `${label} · ${suffix}` : label;
    }
  }
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Grammar({ section }: { section: Data }) {
  const verbTables = section.data.verb_tables ?? [];

  return (
    <SectionShell eyebrow="Grammar" title={section.title}>
      <div className="space-y-6">
        {section.data.points.map((p) => (
          <article key={p.id}>
            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {p.id}
              </span>
              <h3 className="font-display text-lg text-foreground">{p.title}</h3>
              <span className="ml-auto">
                <ReportButton
                  sectionType="grammar"
                  itemType="grammar_point"
                  itemId={p.id}
                  label={`${p.id} · ${p.title}`}
                  snapshot={p}
                />
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {p.explanation}
            </p>
            {p.examples.length > 0 ? (
              <div className="mt-3 space-y-2">
                {p.examples.map((e, i) => (
                  <ExampleRow key={i} {...e} />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {verbTables.length > 0 ? (
        <div className="mt-8 space-y-6">
          <h3 className="font-display text-lg text-foreground">Verb conjugations</h3>
          {verbTables.map((verb, i) => (
            <VerbTableCard key={`${verb.dictionary_form}-${i}`} verb={verb} />
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}

function VerbTableCard({ verb }: { verb: VerbTable }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="jp text-base font-medium text-foreground">{verb.dictionary_form}</span>
        <span className="text-xs text-muted-foreground">
          {verb.romaji} · {verb.english}
        </span>
        {verb.verb_type && verb.verb_type !== "regular" ? (
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {verb.verb_type}
          </span>
        ) : null}
        <span className={verb.verb_type && verb.verb_type !== "regular" ? "" : "ml-auto"}>
          <ReportButton
            sectionType="grammar"
            itemType="verb_table_entry"
            itemId={verb.dictionary_form}
            label={`${verb.dictionary_form} (${verb.romaji})`}
            snapshot={verb}
          />
        </span>
      </div>
      <ul className="divide-y divide-border">
        {verb.conjugations.map((f) => (
          <li key={f.form_name} className="px-4 py-2.5">
            <p className="text-xs text-muted-foreground">{humanForm(f.form_name)}</p>
            <div className="mt-0.5 grid grid-cols-2 items-baseline gap-x-4">
              <span className="jp min-w-0 text-base text-foreground">{f.kana}</span>
              <span className="min-w-0 text-sm">
                <span className="block text-foreground/80">{f.english}</span>
                <span className="block text-muted-foreground">{f.romaji}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
