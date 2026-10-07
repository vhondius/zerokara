import { toHiragana, toRomaji } from "wanakana";

/**
 * Extended katakana spellings for loanwords (ティ, フォ, ウェ…) that
 * wanakana romanizes letter by letter ("tei", "fuo", "ue") instead of the
 * way they're pronounced and written in romaji ("ti", "fo", "we").
 */
const EXTENDED: [string, string][] = [
  ["てぃ", "ti"],
  ["でぃ", "di"],
  ["とぅ", "tu"],
  ["どぅ", "du"],
  ["ふぁ", "fa"],
  ["ふぃ", "fi"],
  ["ふぇ", "fe"],
  ["ふぉ", "fo"],
  ["ふゅ", "fyu"],
  ["うぃ", "wi"],
  ["うぇ", "we"],
  ["うぉ", "wo"],
  ["しぇ", "she"],
  ["じぇ", "je"],
  ["ちぇ", "che"],
  ["ゔぁ", "va"],
  ["ゔぃ", "vi"],
  ["ゔぇ", "ve"],
  ["ゔぉ", "vo"],
  ["ゔ", "vu"],
  ["つぁ", "tsa"],
  ["つぇ", "tse"],
  ["つぉ", "tso"],
  ["くぁ", "kwa"],
  ["ぐぁ", "gwa"],
];
const EXTENDED_RE = new RegExp(EXTENDED.map(([k]) => k).join("|"), "g");
const EXTENDED_MAP = new Map(EXTENDED);

/** Kana (hiragana or katakana) to romaji, leaving latin text and kanji as they are. */
export function kanaToRomaji(s: string): string {
  const hira = toHiragana(s, { passRomaji: true });
  return toRomaji(hira.replace(EXTENDED_RE, (m) => EXTENDED_MAP.get(m) ?? m));
}
