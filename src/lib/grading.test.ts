import { describe, expect, it } from "vitest";
import { gradeAnswer, isCorrect, isLenientlyCorrect } from "./grading";

const lenient = (a: string, ref: string | string[]) => isLenientlyCorrect(a, ref);

describe("fragments are not answers (M1)", () => {
  it.each([
    ["the", "Because the a is held longer."],
    ["ka", "Nan desu ka."],
    ["e", "I like strawberries."],
    ["rain", "It started raining."],
    ["に", "知らない人に騙されました。"],
    ["m", "March; on'yomi (サン)"],
    ["11 minutes", "1 minute"],
    ["yasui deshita", "yasukatta desu"],
  ])("%s is not %s", (answer, ref) => expect(lenient(answer, ref)).toBe(false));
});

describe("correct Japanese in any spelling (M2)", () => {
  it.each([
    ["なんですか", "Nan desu ka."],
    ["ねこじゃないです", "Neko janai desu."],
    ["iie suki ja nai desu", "Iie, suki janai desu."],
    ["dobutsuen wa takai desu ka", "Doubutsuen wa takai desu ka."],
    ["Watashi no kuruma o uranaide kudasai.", "Watashi no kuruma wo uranaide kudasai."],
    ["ごじにわたしのいえにきてください。", "Goji ni watashi no ie ni kite kudasai."],
    ["わたしはがくせいです", "Watashi wa gakusei desu."],
    ["gojū", "gojuu"],
    ["nampun", "nanpun"],
    ["Tōkyō", "Toukyou"],
    ["tu", "tsu"],
    ["si", "shi"],
    ["zi", "ji"],
  ])("%s = %s", (answer, ref) => expect(lenient(answer, ref)).toBe(true));
});

describe("fill-in-the-blank", () => {
  it("accepts any separator between blanks", () => {
    expect(isCorrect("to no", "to / no")).toBe(true);
    expect(isCorrect("to, no", "to / no")).toBe(true);
    expect(isCorrect("to / no", "to / no")).toBe(true);
  });
  it("ignores trailing punctuation", () => expect(isCorrect("hoshii no?", "hoshii no")).toBe(true));
  it("accepts the hiragana for a romaji key", () => expect(isCorrect("い", "i")).toBe(true));
  it("accepts either listed particle", () => {
    expect(isCorrect("e", ["ni", "e"])).toBe(true);
    expect(isCorrect("へ", ["ni", "e"])).toBe(true);
    expect(isCorrect("de", ["ni", "e"])).toBe(false);
  });
  it("still rejects a wrong word", () => expect(isCorrect("ga", "wo")).toBe(false));
});

describe("reference notes and alternatives (R13)", () => {
  it.each([
    ["That cheese is delicious.", "That cheese (near you) is delicious."],
    ["How many flowers did you buy?", "How many flowers (stems) did you buy?"],
    ["He is always fast.", "He is always early/fast."],
    ["He is always early.", "He is always early/fast."],
    ["Give me the key, please.", "Key, please. / Give me the key, please."],
    ["Key, please.", "Key, please. / Give me the key, please."],
    ["It's good, isn't it?", "It's nice / good, isn't it."],
    [
      "Kouen no chikaku ni arimasu",
      "Kouen no chikaku ni arimasu. (soba also works instead of chikaku)",
    ],
  ])("%s matches %s", (answer, ref) => expect(lenient(answer, ref)).toBe(true));
});

describe("British English and times (#23)", () => {
  it.each([
    ["What colour is it?", "What color is it?"],
    ["My daughter is a university student.", "My daughter is a college student."],
    ["I picked up rubbish yesterday.", "I picked up trash yesterday."],
    ["It is from 10:30 until 15:00.", "It's from 10:30 AM until 3:00 PM."],
    ["3pm", "3:00 PM"],
    ["15.00", "3:00 PM"],
    ["half past five", "5:30"],
    ["twenty-one students", "21 students"],
  ])("%s = %s", (answer, ref) => expect(lenient(answer, ref)).toBe(true));
  it("doesn't turn 13:00 into 1 o'clock by substring", () =>
    expect(lenient("13:00", "10:00")).toBe(false));
});

describe("casual register (#23)", () => {
  it.each([
    ["Nichiyoubi dake hima da", "Nichiyoubi dake hima desu."],
    ["Kore ga ichiban da yo.", "Kore ga ichiban desu."],
    ["Ii resutoran ga mitsukerarenakatta", "Ii resutoran ga mitsukeraremasen deshita."],
    ["Kinou eiga wo mita", "Kinou eiga wo mimashita."],
    ["Ashita gakkou ni iku", "Ashita gakkou ni ikimasu."],
    ["Ashita gakkou ni ikanai", "Ashita gakkou ni ikimasen."],
    ["Nihon ni itta", "Nihon ni ikimashita."],
    ["Hon wo yonda yo", "Hon wo yomimashita."],
  ])("%s is accepted for %s, with a note", (answer, ref) => {
    const g = gradeAnswer(answer, ref, { allowCasual: true });
    expect(g.ok).toBe(true);
    expect(g.note).toBeTruthy();
  });
  it("is off when the prompt asks for polite speech", () =>
    expect(gradeAnswer("Hima da", "Hima desu.", { allowCasual: false }).ok).toBe(false));
});

describe("every reference in the books accepts itself", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const failures: string[] = [];
  for (let n = 1; n <= 5; n++) {
    const book = JSON.parse(fs.readFileSync(`src/content/books/jfz-${n}.json`, "utf8"));
    for (const unit of book.units)
      for (const s of unit.sections ?? [])
        for (const ex of s.exercises ?? []) {
          const answers: string[] =
            ex.answer == null ? [] : Array.isArray(ex.answer) ? ex.answer : [ex.answer];
          for (const a of answers) {
            // Slash answers list alternatives; each one alone is what a learner types.
            if (!a.trim() || ex.kind === "matching" || a.includes("/")) continue;
            const ok =
              ex.kind === "fill_blank" ? isCorrect(a, ex.answer) : isLenientlyCorrect(a, ex.answer);
            if (!ok) failures.push(`${unit.id}/${ex.id}: ${a}`);
          }
        }
  }
  it("has no reference that grades itself wrong", () => expect(failures).toEqual([]));
});
