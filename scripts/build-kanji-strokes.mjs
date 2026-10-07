#!/usr/bin/env node
/**
 * Builds public/data/kanji-strokes.json: Hanzi Writer stroke data in
 * *Japanese* stroke order and glyph forms for every kanji the course teaches.
 *
 * Source: animCJK's graphicsJa.txt (https://github.com/parsimonhi/animCJK),
 * one JSON object per line in Make Me a Hanzi format ({character, strokes,
 * medians}, y-up 1024 space), which is exactly what Hanzi Writer loads.
 * Hanzi Writer's own CDN data is Chinese, so it taught Chinese stroke order
 * (e.g. 右 horizontal-first) and lacked Japanese-only forms like 気 or 帰.
 *
 * Usage: node scripts/build-kanji-strokes.mjs [path-or-url-to-graphicsJa.txt]
 * Re-run after adding kanji to the books; it fails if any is missing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  process.argv[2] ?? "https://raw.githubusercontent.com/parsimonhi/animCJK/master/graphicsJa.txt";

function courseKanji() {
  const chars = new Set();
  for (let n = 1; n <= 5; n++) {
    const book = JSON.parse(readFileSync(join(root, `src/content/books/jfz-${n}.json`), "utf8"));
    for (const k of book.kanji_entries ?? []) chars.add(k.char);
    for (const unit of book.units)
      for (const s of unit.sections ?? [])
        if (s.type === "kana_intro" && s.script === "kanji")
          for (const c of s.characters ?? []) chars.add(c.char);
  }
  return [...chars].sort();
}

const text = /^https?:/.test(SOURCE)
  ? await (await fetch(SOURCE)).text()
  : readFileSync(SOURCE, "utf8");

const byChar = new Map();
for (const line of text.split("\n")) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  byChar.set(o.character, { strokes: o.strokes, medians: o.medians });
}

const wanted = courseKanji();
const missing = wanted.filter((c) => !byChar.has(c));
if (missing.length) {
  console.error(`Missing stroke data for: ${missing.join(" ")}`);
  process.exit(1);
}

const out = Object.fromEntries(wanted.map((c) => [c, byChar.get(c)]));
writeFileSync(join(root, "public/data/kanji-strokes.json"), JSON.stringify(out));
console.log(`Wrote ${wanted.length} kanji to public/data/kanji-strokes.json`);
