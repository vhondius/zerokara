import { createFileRoute } from "@tanstack/react-router";
import { jfz1Phrases } from "@/content/reference/schema";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/reference/phrases")({
  head: () => ({
    meta: [
      { title: "Everyday Japanese phrases — quick reference" },
      {
        name: "description",
        content:
          "A quick lookup of everyday Japanese phrases — greetings, self introductions, communication, shopping, dining, and more.",
      },
      { property: "og:title", content: "Everyday Japanese phrases" },
      {
        property: "og:description",
        content: "Everyday Japanese phrases, grouped by situation, for quick reference.",
      },
      { property: "og:url", content: "/reference/phrases" },
    ],
    links: [{ rel: "canonical", href: "/reference/phrases" }],
  }),
  component: PhrasesPage,
});

function PhrasesPageInner() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Reference</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Everyday Phrases</h1>
        <p className="mt-3 text-muted-foreground">
          A lookup list of common Japanese phrases, grouped by situation. Not part of the lesson
          path — just here when you need to grab a phrase.
        </p>
      </header>

      {jfz1Phrases.reference_sections.map((section) => (
        <section key={section.id} className="mb-12">
          {jfz1Phrases.reference_sections.length > 1 && (
            <h2 className="mb-6 font-display text-2xl text-foreground">{section.title}</h2>
          )}
          <div className="space-y-10">
            {section.categories.map((cat) => (
              <div key={cat.category}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent">
                  {cat.category}
                </h3>
                <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card shadow-sheet">
                  {cat.entries.map((entry, i) => (
                    <li key={i} className="px-4 py-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                        <span className="text-sm text-muted-foreground sm:flex-1">
                          {entry.english}
                        </span>
                        <span className="jp text-base text-foreground sm:flex-1 sm:text-right">
                          {entry.japanese}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-2 text-xs italic text-muted-foreground">{entry.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PhrasesPage() {
  return (
    <ColorScope color={SECTION_COLORS.reference}>
      <PhrasesPageInner />
    </ColorScope>
  );
}
