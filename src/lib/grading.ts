import { kanaToRomaji } from "@/lib/kana-romaji";
import type { Exercise } from "@/content/schema";

export type ExerciseKind = Exercise["kind"];

/** Kinds that can be graded objectively by the app. */
export const AUTO_GRADED_KINDS: ExerciseKind[] = ["fill_blank", "multiple_choice", "matching"];

export function isAutoGraded(kind: string): boolean {
  return (AUTO_GRADED_KINDS as string[]).includes(kind);
}

export const isPositiveStatus = (s: string | undefined) => s === "correct" || s === "self-correct";

const OPEN_ENDED_ANSWER = /^\s*(example\b|answers? (may|will) vary)/i;

function hasReference(a: Exercise["answer"]): boolean {
  if (a == null) return false;
  const all = Array.isArray(a) ? a : [a];
  return all.some((r) => r.trim() && !OPEN_ENDED_ANSWER.test(r));
}

/**
 * Whether an exercise can be scored in a book test: excludes writing
 * practice and personal / open-ended questions with no fixed answer.
 */
export function isTestable(ex: Exercise): boolean {
  if (ex.excludeFromTest) return false;
  if (ex.kind === "writing_practice") return false;
  if (/in your own words/i.test(ex.prompt ?? "")) return false;
  if (ex.parts?.length) return ex.parts.every((p) => hasReference(p.answer));
  if (ex.kind === "reading_comprehension") {
    const qs = ex.questions ?? [];
    return qs.length > 0 && qs.every((q) => hasReference(q.answer));
  }
  if (ex.kind === "mini_conversation") {
    const toJapanese = ex.direction === "e-to-j";
    return (ex.lines ?? []).some((l) => answerAsString(toJapanese ? l.japanese : l.english).trim());
  }
  if (ex.kind === "matching") return answerAsString(ex.answer).includes("=");
  return hasReference(ex.answer);
}

/** Trim + lowercase only. Used for picking among fixed options (matching). */
export const norm = (s: string) => s.trim().toLowerCase();

export function answerAsString(a: Exercise["answer"]): string {
  if (a == null) return "";
  return Array.isArray(a) ? a.join(" / ") : a;
}

/* ------------------------------------------------------------------ */
/* Reference answers                                                  */
/* ------------------------------------------------------------------ */

const SENTENCE_END = /[.?!。？！]\s*$/;

/** "early/fast" → both words; "nice / good" (mid-sentence) → both words. */
function expandWordAlternatives(ref: string): string[] {
  const m = ref.match(/(\S+?)\s*\/\s*(\S+)/);
  if (!m || m.index === undefined) return [ref];
  const before = ref.slice(0, m.index);
  const after = ref.slice(m.index + m[0].length);
  return [m[1], m[2]].flatMap((w) => expandWordAlternatives(before + w + after)).slice(0, 16);
}

/**
 * Every acceptable answer a reference stands for. References carry editor
 * notes in parentheses ("That cheese (near you) is delicious.") and
 * alternatives separated by slashes ("Key, please. / Give me the key,
 * please.", "early/fast"); a learner should only have to type one clean
 * version. In fill-in-the-blank answers " / " separates blanks instead
 * ("to / no"), so there only word-level "x/y" splits apply.
 */
function referenceAlternatives(ref: string, blanks: boolean): string[] {
  const noNotes = ref.replace(/\s*[（(][^)）]*[)）]/g, "").trim();
  // Typing the reference word for word, note included, also counts.
  const withNotes = ref
    .replace(/[（()）]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const pieces =
    !blanks && noNotes.includes(" / ")
      ? noNotes.split(" / ").every((p, i, all) => i === all.length - 1 || SENTENCE_END.test(p))
        ? noNotes.split(" / ")
        : [noNotes]
      : [noNotes];
  const out = new Set<string>();
  for (const piece of pieces) {
    if (blanks) {
      // Keep " / " as the blank separator; only split "x/y" without spaces.
      const parts = piece.split(" / ").map((p) => (/\S\/\S/.test(p) ? p.split("/") : [p]));
      const combos = parts.reduce<string[][]>(
        (acc, opts) => acc.flatMap((a) => opts.map((o) => [...a, o])),
        [[]],
      );
      for (const c of combos.slice(0, 16)) out.add(c.join(" "));
    } else {
      for (const alt of expandWordAlternatives(piece)) out.add(alt);
    }
  }
  if (withNotes !== noNotes) out.add(withNotes);
  return [...out].filter((r) => r.trim());
}

function refs(a: Exercise["answer"], blanks = false): string[] {
  if (a == null) return [];
  const list = Array.isArray(a) ? a : [a];
  return list.flatMap((r) => referenceAlternatives(r, blanks));
}

/* ------------------------------------------------------------------ */
/* English normalisation                                              */
/* ------------------------------------------------------------------ */

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const NUMBER_WORDS: Record<string, string> = {};
UNITS.forEach((w, i) => (NUMBER_WORDS[w] = String(i)));
TEENS.forEach((w, i) => (NUMBER_WORDS[w] = String(10 + i)));
TENS.forEach((t, i) => {
  if (!t) return;
  NUMBER_WORDS[t] = String(i * 10);
  UNITS.slice(1).forEach(
    (u, j) => (NUMBER_WORDS[`${t}-${u}`] = NUMBER_WORDS[`${t} ${u}`] = String(i * 10 + j + 1)),
  );
});
const NUMBER_WORDS_RE = new RegExp(
  `\\b(${Object.keys(NUMBER_WORDS)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "g",
);

/** English contractions expanded before comparison, so "I'm" and "I am" match. */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, "i am"],
  [/\b(it|that|he|she|what|there|who|where|here)'s\b/g, "$1 is"],
  [/\blet's\b/g, "let us"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\b(you|we|they|who|what)'re\b/g, "$1 are"],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, "$1 will"],
  [/\b(i|you|we|they)'ve\b/g, "$1 have"],
  [/\b(i|you|we|they|he|she)'d\b/g, "$1 would"],
];

function expandContractions(s: string): string {
  let out = s.replace(/[‘’`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  // "cannot" and "can not" are both common spellings.
  return out.replace(/\bcan not\b/g, "cannot");
}

/**
 * British spellings and words folded to the American ones the answer keys
 * use, so "colour", "flat" or "mobile phone" aren't marked wrong. Applied to
 * both sides; multi-word entries first.
 */
const BRITISH: [string, string][] = [
  ["mobile phone", "cell phone"],
  ["cellular phone", "cell phone"],
  ["petrol station", "gas station"],
  ["railway station", "train station"],
  ["post box", "mailbox"],
  ["car park", "parking lot"],
  ["shopping centre", "mall"],
  ["shopping mall", "mall"],
  ["underground", "subway"],
  ["the cinema", "the movies"],
  ["cinema", "movie theater"],
  ["movie theatre", "movie theater"],
  ["colour", "color"],
  ["colours", "colors"],
  ["colourful", "colorful"],
  ["favourite", "favorite"],
  ["favourites", "favorites"],
  ["neighbour", "neighbor"],
  ["neighbours", "neighbors"],
  ["neighbourhood", "neighborhood"],
  ["honour", "honor"],
  ["humour", "humor"],
  ["labour", "labor"],
  ["flavour", "flavor"],
  ["behaviour", "behavior"],
  ["harbour", "harbor"],
  ["rumour", "rumor"],
  ["centre", "center"],
  ["theatre", "theater"],
  ["metre", "meter"],
  ["metres", "meters"],
  ["kilometre", "kilometer"],
  ["kilometres", "kilometers"],
  ["centimetre", "centimeter"],
  ["centimetres", "centimeters"],
  ["litre", "liter"],
  ["litres", "liters"],
  ["grey", "gray"],
  ["aeroplane", "airplane"],
  ["aeroplanes", "airplanes"],
  ["organise", "organize"],
  ["realise", "realize"],
  ["apologise", "apologize"],
  ["practise", "practice"],
  ["travelled", "traveled"],
  ["travelling", "traveling"],
  ["cancelled", "canceled"],
  ["jewellery", "jewelry"],
  ["programme", "program"],
  ["cheque", "check"],
  ["pyjamas", "pajamas"],
  ["flat", "apartment"],
  ["flats", "apartments"],
  ["film", "movie"],
  ["films", "movies"],
  ["rubbish", "trash"],
  ["bin", "trash can"],
  ["lorry", "truck"],
  ["petrol", "gas"],
  ["rubber", "eraser"],
  ["maths", "math"],
  ["football", "soccer"],
  ["shop", "store"],
  ["shops", "stores"],
  ["bookshop", "bookstore"],
  ["holiday", "vacation"],
  ["holidays", "vacation"],
  ["autumn", "fall"],
  ["biscuit", "cookie"],
  ["biscuits", "cookies"],
  ["sweets", "candy"],
  ["chips", "fries"],
  ["crisps", "chips"],
  ["trousers", "pants"],
  ["lift", "elevator"],
  ["queue", "line"],
  ["university", "college"],
  ["post", "mail"],
  ["timetable", "schedule"],
  ["motorway", "highway"],
  ["pavement", "sidewalk"],
  ["toilet", "bathroom"],
  ["mum", "mom"],
];
const BRITISH_RE = new RegExp(
  `\\b(${BRITISH.map(([b]) => b)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "g",
);
const BRITISH_MAP = new Map(BRITISH);

/**
 * Clock times in any common form become "<h12>:<mm>": "3pm", "3 p.m.",
 * "3:00 PM", "15:00", "15.00", "3 o'clock", "half past three" all compare
 * equal. A bare number ("3 apples") is left alone.
 */
function normalizeTimes(s: string): string {
  const fmt = (h: number, m: number) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`;
  return s
    .replace(/\bhalf past (\d{1,2})\b/g, (_, h) => fmt(+h, 30))
    .replace(/\bquarter past (\d{1,2})\b/g, (_, h) => fmt(+h, 15))
    .replace(/\bquarter to (\d{1,2})\b/g, (_, h) => fmt(+h - 1, 45))
    .replace(
      /\b(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?\s*(a\.?\s?m\b\.?|p\.?\s?m\b\.?|o'?\s?clock\b)/g,
      (_, h, m) => fmt(+h, +(m ?? 0)),
    )
    .replace(/\b(\d{1,2})\s*[:.]\s*(\d{2})\b/g, (_, h, m) =>
      +h < 24 && +m < 60 ? fmt(+h, +m) : _,
    );
}

function englishNorm(s: string): string {
  return normalizeTimes(
    expandContractions(s.normalize("NFKC").toLowerCase())
      .replace(NUMBER_WORDS_RE, (w) => NUMBER_WORDS[w])
      .replace(BRITISH_RE, (w) => BRITISH_MAP.get(w) ?? w),
  )
    .replace(/(\d):(\d)/g, "$1∶$2") // keep the time colon (as ∶) through punctuation stripping
    .replace(/[.,!?;:'"“”‘’()[\]{}\-–—_/\\]/g, " ")
    .replace(/[。、！？；：「」『』（）・]/g, " ")
    .replace(/∶/g, ":")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Japanese normalisation                                             */
/* ------------------------------------------------------------------ */

const KANA_OR_KANJI = /[぀-ヿ㐀-鿿]/;
const ROMAJI_MARKERS =
  /\b(desu|deshita|masu|mashita|masen|mashou|kudasai|imasu|arimasu|wa|ga|wo|ni|de|ka|ne|yo|da|datta|janai|ja|nai)\b/;

/** Whether a reference is Japanese (in kana/kanji or in romaji). */
function looksJapanese(ref: string): boolean {
  return KANA_OR_KANJI.test(ref) || ROMAJI_MARKERS.test(ref.toLowerCase());
}

/**
 * One spelling for every way of writing the same Japanese: kana is read as
 * romaji; Hepburn, wāpuro and Kunrei spellings, long-vowel styles (ou, oo,
 * ō), を as wo or o, n'/m before b and p, spaces and punctuation are all
 * folded together. `particles` also folds は/へ written as ha/he into wa/e,
 * for answers typed in kana where the particle can't be told apart.
 */
function japaneseNorm(s: string, particles: boolean): string {
  let r = kanaToRomaji(s.normalize("NFKC").toLowerCase());
  r = r
    .replace(/[āâ]/g, "a")
    .replace(/[īî]/g, "i")
    .replace(/[ūû]/g, "u")
    .replace(/[ēê]/g, "e")
    .replace(/[ōô]/g, "o")
    .replace(/n'/g, "n")
    .replace(/[^a-z0-9㐀-鿿぀-ヿ]/g, "") // spaces, punctuation, hyphens
    .replace(/m(?=[bpm])/g, "n")
    .replace(/sh/g, "s")
    .replace(/ch/g, "t")
    .replace(/ts/g, "t")
    .replace(/j/g, "z")
    .replace(/f/g, "h")
    .replace(/(?<=[sztc])y/g, "")
    .replace(/ou|oo/g, "o")
    .replace(/uu/g, "u")
    .replace(/wo/g, "o");
  if (particles) r = r.replace(/ha/g, "wa").replace(/he/g, "e");
  return r;
}

/* ------------------------------------------------------------------ */
/* Casual (plain-form) equivalents of polite references               */
/* ------------------------------------------------------------------ */

/** Godan stem endings (i-row) → [dictionary, nai-stem, ta-form] endings. */
const GODAN: Record<string, [string, string, string]> = {
  ki: ["ku", "ka", "ita"],
  gi: ["gu", "ga", "ida"],
  shi: ["su", "sa", "shita"],
  chi: ["tsu", "ta", "tta"],
  ni: ["nu", "na", "nda"],
  bi: ["bu", "ba", "nda"],
  mi: ["mu", "ma", "nda"],
  ri: ["ru", "ra", "tta"],
  i: ["u", "wa", "tta"],
};

/** Plain forms a masu-stem may stand for (godan and ichidan readings both tried). */
function plainForms(stem: string): {
  dict: string[];
  neg: string[];
  past: string[];
  pastNeg: string[];
} {
  if (stem === "shi" || stem.endsWith(" shi"))
    return {
      dict: [stem.replace(/shi$/, "suru")],
      neg: [stem.replace(/shi$/, "shinai")],
      past: [stem.replace(/shi$/, "shita")],
      pastNeg: [stem.replace(/shi$/, "shinakatta")],
    };
  if (stem === "ki")
    return { dict: ["kuru"], neg: ["konai"], past: ["kita"], pastNeg: ["konakatta"] };
  const out = {
    dict: [] as string[],
    neg: [] as string[],
    past: [] as string[],
    pastNeg: [] as string[],
  };
  // ichidan: stem + ru
  out.dict.push(stem + "ru");
  out.neg.push(stem + "nai");
  out.past.push(stem + "ta");
  out.pastNeg.push(stem + "nakatta");
  const end = ["shi", "chi", "ki", "gi", "ni", "bi", "mi", "ri", "i"].find((e) => stem.endsWith(e));
  if (end) {
    const base = stem.slice(0, -end.length);
    const [d, n, t] = GODAN[end];
    out.dict.push(base + d);
    out.neg.push(base + n + "nai");
    // 行く is the one く-verb with a っ past: iki → itta, not iita.
    out.past.push(stem === "iki" ? base + "tta" : base + t);
    out.pastNeg.push(base + n + "nakatta");
  }
  return out;
}

/** Plain-speech versions of a polite romaji reference ("…desu" → "…da", "…masen deshita" → "…nakatta"). */
function casualVariants(ref: string): string[] {
  const r = ref
    .toLowerCase()
    .replace(/[.?!。？！]+\s*$/, "")
    .trim();
  const out = new Set<string>();
  const add = (v: string) => out.add(v.trim());
  let m: RegExpMatchArray | null;
  if ((m = r.match(/^(.*?)\s*(?:dewa|ja)\s*arimasen deshita$/))) add(`${m[1]} janakatta`);
  else if ((m = r.match(/^(.*?)\s*(?:dewa|ja)\s*(?:arimasen|nai desu)$/))) add(`${m[1]} janai`);
  else if ((m = r.match(/^(.*?)(\S+?)masen deshita(?:\s*ka)?$/))) {
    for (const v of plainForms(m[2]).pastNeg) add(m[1] + v);
  } else if ((m = r.match(/^(.*?)\s*deshita$/))) add(`${m[1]} datta`);
  else if ((m = r.match(/^(.*?)\s*desu(?:\s*ka)?$/))) {
    add(`${m[1]} da`);
    add(m[1]); // i-adjectives drop です; casual questions drop it too
  } else if ((m = r.match(/^(.*?)(\S+?)masen(?:\s*ka)?$/))) {
    for (const v of plainForms(m[2]).neg) add(m[1] + v);
  } else if ((m = r.match(/^(.*?)(\S+?)mashita(?:\s*ka)?$/))) {
    for (const v of plainForms(m[2]).past) add(m[1] + v);
  } else if ((m = r.match(/^(.*?)(\S+?)masu(?:\s*ka)?$/))) {
    for (const v of plainForms(m[2]).dict) add(m[1] + v);
  } else if ((m = r.match(/^(.*?)(\S+?)mashou(?:\s*ka)?$/))) {
    for (const v of plainForms(m[2]).dict)
      add(m[1] + v.replace(/u$/, "ou").replace(/ruou$/, "you"));
  }
  return [...out].filter(Boolean);
}

/** Casual sentence-final particles and question marks a learner may add. */
const stripFinalParticles = (s: string) =>
  s.replace(/(?:\s*(?:yo|ne|na|no|yo ne|kana)\b)+[\s.?!]*$/, "").trim();

/* ------------------------------------------------------------------ */
/* Grading                                                            */
/* ------------------------------------------------------------------ */

export type Grade = { ok: boolean; note?: string };

/**
 * Grades a typed answer against a reference. The whole answer has to match
 * one acceptable version of the reference: fragments like "ka" or "the" are
 * wrong. What's forgiven is spelling, not content: case, punctuation,
 * contractions, numbers in words, clock formats, British English, and for
 * Japanese, kana vs romaji and every romanization style.
 *
 * `blanks`: the reference is a fill-in-the-blank key, where " / " separates
 * blanks. `allowCasual`: a plain-form answer to a polite Japanese reference
 * counts, with a note (off when the prompt asks for polite speech).
 */
export function gradeAnswer(
  userAnswer: string,
  ref: Exercise["answer"],
  opts: { blanks?: boolean; allowCasual?: boolean } = {},
): Grade {
  const typed = userAnswer.trim();
  if (!typed) return { ok: false };
  const blanks = opts.blanks ?? false;
  const alternatives = refs(ref, blanks);
  const typedBlanks = blanks ? typed.replace(/\s*[/,、]\s*/g, " ") : typed;

  for (const r of alternatives) {
    // Single words ("kirin") carry no grammar to recognise them as Japanese,
    // so they're compared both ways; so is anything the learner typed in kana.
    const japanese = looksJapanese(r) || KANA_OR_KANJI.test(typed) || !/\s/.test(r.trim());
    if (!looksJapanese(r) && englishNorm(typedBlanks) === englishNorm(r)) return { ok: true };
    if (japanese) {
      for (const particles of [false, true]) {
        if (japaneseNorm(typedBlanks, particles) === japaneseNorm(r, particles))
          return { ok: true };
      }
    }
  }

  if (opts.allowCasual && !blanks) {
    const plain = stripFinalParticles(
      kanaToRomaji(typed.toLowerCase()).replace(/[.?!。？！]+\s*$/, ""),
    );
    for (const r of alternatives) {
      if (!looksJapanese(r) || KANA_OR_KANJI.test(r)) continue;
      for (const v of casualVariants(r)) {
        for (const particles of [false, true]) {
          if (japaneseNorm(plain, particles) === japaneseNorm(v, particles))
            return {
              ok: true,
              note: "Correct in casual speech. The book uses the polite form here.",
            };
        }
      }
    }
  }
  return { ok: false };
}

/** Fill-in-the-blank and multiple choice. */
export function isCorrect(userAnswer: string, ref: Exercise["answer"]): boolean {
  return gradeAnswer(userAnswer, ref, { blanks: true }).ok;
}

/** Translations and other free-form answers. */
export function isLenientlyCorrect(userAnswer: string, ref: Exercise["answer"]): boolean {
  return gradeAnswer(userAnswer, ref, { allowCasual: true }).ok;
}

/** Multiple choice: the picked option must be the listed answer itself (options can differ by one long vowel). */
export function isOptionCorrect(option: string, ref: Exercise["answer"]): boolean {
  if (ref == null) return false;
  return (Array.isArray(ref) ? ref : [ref]).some((r) => norm(r) === norm(option));
}
