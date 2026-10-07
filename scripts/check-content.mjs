#!/usr/bin/env node
/**
 * Content checks that run before every static build (npm run build:static).
 * Each one guards a bug the July/October UX tests found in shipped content:
 *
 * - matching exercises must parse into at least two key=value pairs
 *   (an unparseable one made Book 2 Lesson 2 impossible to
 *   complete, which locked the Book 2 test forever);
 * - example lines must hold Japanese script in their `japanese` field
 *   (~650 had romaji copied in, so the same romaji showed twice); Book 1's
 *   pre-lessons, taught before hiragana, are the one allowed exception;
 * - vocabulary kana and romaji must spell the same word;
 * - a kanji's example words must contain that kanji, and a kanji with an
 *   on'yomi used in its examples must list one.
 *
 * Exits non-zero with a list of problems.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toHiragana, toRomaji } from "wanakana";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Kanji made in Japan that genuinely have no on'yomi. */
const NO_ONYOMI = new Set(["畑", "込", "峠", "匂", "枠", "笹", "栃", "畠"]);
const JP = /[぀-ヿ㐀-鿿]/;
const problems = [];
const report = (where, msg) => problems.push(`${where}: ${msg}`);

// Same as src/lib/kana-romaji.ts: extended katakana wanakana spells letter by letter.
const EXTENDED = {
  てぃ: "ti",
  でぃ: "di",
  とぅ: "tu",
  どぅ: "du",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  しぇ: "she",
  じぇ: "je",
  ちぇ: "che",
  ゔ: "vu",
};
const kanaToRomaji = (s) =>
  toRomaji(
    toHiragana(s, { passRomaji: true }).replace(
      /てぃ|でぃ|とぅ|どぅ|ふぁ|ふぃ|ふぇ|ふぉ|うぃ|うぇ|うぉ|しぇ|じぇ|ちぇ|ゔ/g,
      (m) => EXTENDED[m],
    ),
  );

/** Folds romanization styles so "toukyou"/"tōkyō"/"tokyo" spell the same. */
function fold(s) {
  return s
    .toLowerCase()
    .replace(/[āâ]/g, "a")
    .replace(/[īî]/g, "i")
    .replace(/[ūû]/g, "u")
    .replace(/[ēê]/g, "e")
    .replace(/[ōô]/g, "o")
    .replace(/tch/g, "cch")
    .replace(/[^a-z]/g, "")
    .replace(/m(?=[bpm])/g, "n")
    .replace(/ou|oo|oh/g, "o")
    .replace(/uu/g, "u")
    .replace(/ei/g, "e")
    .replace(/wo/g, "o")
    .replace(/(.)\1/g, "$1");
}

function walk(node, visit, path = []) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, visit, [...path, i]));
  if (node && typeof node === "object") {
    visit(node, path);
    for (const [k, v] of Object.entries(node)) walk(v, visit, [...path, k]);
  }
}

for (let n = 1; n <= 5; n++) {
  const book = JSON.parse(readFileSync(join(root, `src/content/books/jfz-${n}.json`), "utf8"));
  for (const unit of book.units) {
    const where = `jfz-${n}/${unit.id}`;
    const preHiragana = n === 1 && unit.type === "pre-lesson";

    walk(unit, (o) => {
      // Matching exercises
      if (o.kind === "matching" && o.id) {
        const ref = Array.isArray(o.answer) ? o.answer.join(", ") : (o.answer ?? "");
        const pairs = ref
          .split(",")
          .map((c) => c.split("="))
          .filter(([k, v]) => k?.trim() && v?.trim());
        if (pairs.length < 2) report(where, `${o.id} matching answer has no key=value pairs`);
      }

      // Example lines (grammar examples etc.): japanese must be Japanese.
      if (
        typeof o.japanese === "string" &&
        typeof o.romaji === "string" &&
        typeof o.english === "string" &&
        !JP.test(o.japanese) &&
        !preHiragana
      )
        report(where, `example "${o.japanese}" has romaji in its japanese field`);

      // Vocabulary words: kana and romaji must agree.
      if (
        typeof o.kana === "string" &&
        typeof o.romaji === "string" &&
        JP.test(o.kana) &&
        !/[\u3400-\u9fff]/.test(o.kana)
      ) {
        const kana = o.kana.replace(/[〜~]/g, "").replace(/（[^）]*）|\([^)]*\)/g, "");
        const fromKana = fold(kanaToRomaji(kana));
        const given = fold(o.romaji.replace(/\(.*?\)/g, ""));
        // は read as "wa" (こんにちは → konnichiwa) is fine.
        const asWa = fold(kanaToRomaji(kana.replace(/は$/, "わ")));
        if (fromKana && given && fromKana !== given && asWa !== given)
          report(where, `vocab ${o.kana} is romanized "${o.romaji}"`);
      }
    });

    // Kanji cards
    for (const s of unit.sections ?? []) {
      if (s.type !== "kana_intro" || s.script !== "kanji") continue;
      for (const c of s.characters ?? []) {
        for (const w of c.example_words ?? []) {
          if (JP.test(w.japanese) && !w.japanese.includes(c.char))
            report(where, `kanji ${c.char} example "${w.japanese}" doesn't contain it`);
          if (!JP.test(w.japanese))
            report(where, `kanji ${c.char} example "${w.japanese}" isn't in Japanese`);
        }
        if (!(c.onyomi ?? []).length && !NO_ONYOMI.has(c.char))
          report(where, `kanji ${c.char} has no on'yomi listed`);
      }
    }
  }
}

if (problems.length) {
  console.error(
    `check-content: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log("check-content: OK");
