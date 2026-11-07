#!/usr/bin/env node
/**
 * Writes src/content/furigana.json: the hiragana reading over each kanji in every content string,
 * for Settings → "Hiragana above kanji". Run after changing book content:
 *
 *   node scripts/furigana.mjs
 *
 * Readings come from the book's own vocabulary first (a word with `kanji` and `kana`, so 今日 is
 * きょう as the book teaches it), then scripts/furigana-overrides.json, then the kuromoji
 * analyser. Okurigana stays outside the ruby: 食べる → 食(た)べる. check-content.mjs fails the
 * build when a kanji string has no entry or an entry does not spell its string.
 *
 * Output: { "<text>": [ "plain", ["漢字", "かんじ"], … ] } plus "#words": the word list the app
 * falls back on for text built at run time.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";
import { align, HAS_KANJI } from "../src/lib/furigana-align.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirs = ["src/content/books", "src/content/reference"].map((d) => join(root, d));
const files = contentDirs.flatMap((d) =>
  readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(d, f)),
);

/** Every string in the content, and every vocabulary word (kanji with its kana). */
const strings = new Set();
const vocab = new Map();
function walk(o) {
  if (typeof o === "string") {
    // A lone kanji has no one reading (a kanji card lists them all): no entry.
    if (HAS_KANJI.test(o) && !/^\s*\S\s*$/.test(o)) strings.add(o);
  } else if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === "object") {
    if (typeof o.kanji === "string" && typeof o.kana === "string" && HAS_KANJI.test(o.kanji)) {
      const kana = toHiragana(o.kana.trim(), { passRomaji: true });
      // Only a word whose kana spells it (one reading, okurigana matching) is trusted.
      if (!vocab.has(o.kanji) && align(o.kanji, kana)) vocab.set(o.kanji, kana);
    }
    Object.values(o).forEach(walk);
  }
}
for (const f of files) walk(JSON.parse(readFileSync(f, "utf8")));

const overrides = JSON.parse(readFileSync(join(root, "scripts/furigana-overrides.json"), "utf8"));
for (const [word, kana] of Object.entries(overrides.words ?? {})) vocab.set(word, kana);
// Longest first, so 日本語 wins over 日本.
const words = [...vocab.keys()].sort((a, b) => b.length - a.length);

const tokenizer = await new Promise((resolve, reject) =>
  kuromoji
    .builder({ dicPath: join(root, "node_modules/kuromoji/dict") })
    .build((err, t) => (err ? reject(err) : resolve(t))),
);

/** Pieces for one string: book words where they fit, the analyser's tokens elsewhere. */
function piecesOf(text) {
  if (overrides.texts?.[text]) return overrides.texts[text];
  const tokens = tokenizer.tokenize(text);
  const tokenAt = new Map();
  let pos = 0;
  for (const t of tokens) {
    tokenAt.set(pos, t);
    pos += t.surface_form.length;
  }
  const out = [];
  const push = (p) => {
    if (typeof p === "string" && typeof out.at(-1) === "string") out[out.length - 1] += p;
    else out.push(p);
  };
  let i = 0;
  while (i < text.length) {
    const word =
      HAS_KANJI.test(text[i]) || tokenAt.has(i)
        ? words.find((w) => text.startsWith(w, i))
        : undefined;
    // A book word counts only where it starts and ends on the analyser's token edges (so 日本
    // inside 毎日本を is not read にほん).
    if (
      word &&
      tokenAt.has(i) &&
      (tokenAt.has(i + word.length) || i + word.length === text.length)
    ) {
      align(word, vocab.get(word)).forEach(push);
      i += word.length;
      continue;
    }
    const t = tokenAt.get(i);
    if (!t) {
      push(text[i]);
      i += 1;
      continue;
    }
    const surface = t.surface_form;
    const reading = t.reading && t.reading !== "*" ? toHiragana(t.reading) : null;
    const pieces = HAS_KANJI.test(surface) && reading ? align(surface, reading) : null;
    (pieces ?? [surface]).forEach(push);
    i += surface.length;
  }
  return out;
}

const out = {};
for (const text of [...strings].sort()) out[text] = piecesOf(text);
out["#words"] = Object.fromEntries(words.map((w) => [w, align(w, vocab.get(w))]));
writeFileSync(join(root, "src/content/furigana.json"), `${JSON.stringify(out)}\n`);
console.log(`furigana.json: ${strings.size} strings, ${words.length} book words`);
