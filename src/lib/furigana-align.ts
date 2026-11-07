/**
 * Puts a word's reading over its kanji only: the kana around and between the kanji (okurigana)
 * stays plain. 食べる + たべる → [["食", "た"], "べる"]; 取り消し + とりけし →
 * [["取", "と"], "り", ["消", "け"], "し"]. Shared by scripts/furigana.mjs and the app.
 */
export type FuriganaPiece = string | [base: string, reading: string];

export const HAS_KANJI = /[㐀-鿿々〆ヶ]/;
const KANJI_RUN = /([㐀-鿿々〆ヶ]+)/;

/** The pieces, or null when the reading does not fit the word's kana. */
export function align(word: string, reading: string): FuriganaPiece[] | null {
  const parts = word.split(KANJI_RUN).filter(Boolean);
  const hira = (s: string) =>
    s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const pattern = parts
    .map((p) =>
      HAS_KANJI.test(p) ? "(.+?)" : `(${hira(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    )
    .join("");
  const m = new RegExp(`^${pattern}$`).exec(hira(reading));
  if (!m) return null;
  return parts.map((p, i) => (HAS_KANJI.test(p) ? [p, m[i + 1] as string] : p));
}

/** Text the content does not hold as a whole (built at run time): the book's words, longest first. */
export function piecesFromWords(
  text: string,
  dict: Record<string, FuriganaPiece[]>,
  sorted: readonly string[],
): FuriganaPiece[] {
  const out: FuriganaPiece[] = [];
  let i = 0;
  while (i < text.length) {
    const w = HAS_KANJI.test(text[i] as string)
      ? sorted.find((k) => text.startsWith(k, i))
      : undefined;
    if (w) {
      out.push(...(dict[w] as FuriganaPiece[]));
      i += w.length;
    } else {
      if (typeof out.at(-1) === "string") out[out.length - 1] += text[i];
      else out.push(text[i] as string);
      i += 1;
    }
  }
  return out;
}
