import { toHiragana } from "wanakana";

type Word = { japanese: string; romaji: string; english: string };

const HAS_KANJI = /[㐀-鿿]/;

/** Hiragana reading for a word's romaji ("tegami" → てがみ), for furigana. */
function reading(romaji: string): string {
  return toHiragana(romaji.replace(/\s+/g, ""), { passRomaji: false });
}

/**
 * A kanji's example words, each with its reading as furigana above it and the
 * meaning beside it. Example words are how a kanji's readings stick.
 */
export function ExampleWords({ words, max = 4 }: { words: Word[]; max?: number }) {
  const shown = words.filter((w) => w.japanese.trim()).slice(0, max);
  if (shown.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {shown.map((w) => (
        <li key={w.japanese} className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="jp text-base text-foreground">
            {HAS_KANJI.test(w.japanese) ? (
              <ruby>
                {w.japanese}
                <rt className="text-[0.6em] text-muted-foreground">{reading(w.romaji)}</rt>
              </ruby>
            ) : (
              w.japanese
            )}
          </span>
          <span className="text-muted-foreground">{w.english}</span>
        </li>
      ))}
    </ul>
  );
}
