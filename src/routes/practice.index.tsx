import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { allHiragana, allKatakana, allKanji } from "@/lib/kana-index";
import { useDueCount } from "@/hooks/use-srs";
import { ColorBlock } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";

export const Route = createFileRoute("/practice/")({
  head: () => ({
    meta: [
      { title: "Practice — Kana & Kanji" },
      {
        name: "description",
        content: "Flashcards, quizzes, and stroke tracing for hiragana, katakana, and kanji.",
      },
      { property: "og:title", content: "Practice — Kana & Kanji" },
      {
        property: "og:description",
        content: "Flashcards, quizzes, and stroke tracing for hiragana, katakana, and kanji.",
      },
      { property: "og:url", content: "/practice" },
    ],
    links: [{ rel: "canonical", href: "/practice" }],
  }),
  component: PracticeIndex,
});

const scripts = [
  {
    to: "/practice/hiragana" as const,
    label: "Hiragana",
    jp: "ひらがな",
    note: "Flashcards, quizzes, and stroke tracing for every hiragana introduced across the course.",
    ready: true,
  },
  {
    to: "/practice/katakana" as const,
    label: "Katakana",
    jp: "カタカナ",
    note: "Flashcards, quizzes, and stroke tracing for every katakana introduced across the course.",
    ready: true,
  },
  {
    to: "/practice/kanji" as const,
    label: "Kanji",
    jp: "漢字",
    note: "Meaning, on'yomi and kun'yomi flashcards, quizzes, and stroke tracing for every kanji taught in the Kanji Lessons.",
    ready: true,
  },
  {
    to: "/practice/vocabulary" as const,
    label: "Vocabulary",
    jp: "単語",
    note: "Flashcards and typed quizzes over every vocabulary word taught across the course, filterable by book or by what you've studied.",
    ready: true,
  },
];

function PracticeIndex() {
  const hiragana = useMemo(() => allHiragana(), []);
  const katakana = useMemo(() => allKatakana(), []);
  const hiraganaDue = useDueCount(hiragana, "kana");
  const katakanaDue = useDueCount(katakana, "kana");
  const kanji = useMemo(() => allKanji(), []);
  const kanjiDue = useDueCount(kanji, "kanji");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl text-foreground">Practice</h1>
      <p className="mt-2 text-muted-foreground">
        Drills that work independently of the course path.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {scripts.map((s) => (
          <ColorBlock
            key={s.to}
            color={
              s.to === "/practice/kanji"
                ? SECTION_COLORS.kanji
                : s.to === "/practice/vocabulary"
                  ? SECTION_COLORS.reference
                  : SECTION_COLORS.hiragana
            }
          >
            <Link
              to={s.to}
              className={`block rounded-xl border p-6 transition-[border-color,box-shadow,translate] ${s.ready ? "border-border bg-card shadow-sheet hover:border-accent hover:shadow-lift active:translate-y-px" : "border-dashed border-border bg-card/40"}`}
            >
              <div className="jp text-3xl text-accent">{s.jp}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-display text-xl text-foreground">{s.label}</span>
                {!s.ready ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    Later
                  </span>
                ) : null}
                {s.ready && s.to === "/practice/hiragana" && hiraganaDue > 0 ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
                    {hiraganaDue} due
                  </span>
                ) : null}
                {s.ready && s.to === "/practice/kanji" && kanjiDue > 0 ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
                    {kanjiDue} due
                  </span>
                ) : null}
                {s.ready && s.to === "/practice/katakana" && katakanaDue > 0 ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
                    {katakanaDue} due
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
            </Link>
          </ColorBlock>
        ))}
      </div>

      <section className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Credits</p>
        <p className="mt-2 max-w-2xl">
          Stroke animation and tracing use{" "}
          <a
            href="https://hanziwriter.org"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Hanzi Writer
          </a>{" "}
          with hiragana stroke data from{" "}
          <a
            href="https://github.com/hy2k/kana-svg-data"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            kana-svg-data
          </a>{" "}
          (LGPL-3.0+), derived from the{" "}
          <a
            href="https://github.com/parsimonhi/animCJK"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            animCJK
          </a>{" "}
          project and originally the{" "}
          <a
            href="https://github.com/skishore/makemeahanzi"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Make Me a Hanzi
          </a>{" "}
          data set. Kanji stroke data, in Japanese stroke order, also comes from animCJK (Arphic
          Public License).
        </p>
      </section>
    </div>
  );
}
