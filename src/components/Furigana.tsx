import { Fragment, useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { HAS_KANJI, piecesFromWords, type FuriganaPiece } from "@/lib/furigana-align";

/**
 * Text with hiragana over its kanji when Settings → "Hiragana above kanji" is on. Readings come
 * from src/content/furigana.json (scripts/furigana.mjs), loaded only once the setting is on.
 * `show={false}` keeps the text plain where the reading would answer the question; never use it
 * on a word shown next to its own kana (vocabulary tables, word cards).
 */
type Data = Record<string, FuriganaPiece[]> & { "#words": Record<string, FuriganaPiece[]> };

let loading: Promise<Data> | null = null;
let loaded: Data | null = null;
let words: string[] = [];

function useFuriganaData(want: boolean): Data | null {
  const [data, setData] = useState<Data | null>(loaded);
  useEffect(() => {
    if (!want || data) return;
    loading ??= import("@/content/furigana.json").then((m) => {
      loaded = m.default as unknown as Data;
      words = Object.keys(loaded["#words"]).sort((a, b) => b.length - a.length);
      return loaded;
    });
    let live = true;
    void loading.then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [want, data]);
  return want ? data : null;
}

export function Furigana({ text, show = true }: { text: string; show?: boolean }) {
  const { furigana } = useTheme();
  const data = useFuriganaData(furigana && show && HAS_KANJI.test(text));
  if (!data) return <>{text}</>;
  const pieces = data[text] ?? piecesFromWords(text, data["#words"], words);
  return (
    <>
      {pieces.map((p, i) =>
        typeof p === "string" ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <ruby key={i}>
            {p[0]}
            <rt>{p[1]}</rt>
          </ruby>
        ),
      )}
    </>
  );
}
