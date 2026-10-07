import { it, expect } from "vitest";
import fs from "node:fs";
import { isOptionCorrect } from "./grading";
it("every multiple-choice answer option grades as correct, and no other option does", () => {
  const bad: string[] = [];
  for (let n = 1; n <= 5; n++) {
    const book = JSON.parse(fs.readFileSync(`src/content/books/jfz-${n}.json`, "utf8"));
    for (const unit of book.units)
      for (const s of unit.sections ?? [])
        for (const ex of s.exercises ?? []) {
          if (ex.kind !== "multiple_choice" || !ex.options) continue;
          const right = ex.options.filter((o: string) => isOptionCorrect(o, ex.answer));
          if (right.length !== 1)
            bad.push(`${ex.id}: ${JSON.stringify(ex.answer)} -> ${JSON.stringify(right)}`);
        }
  }
  expect(bad).toEqual([]);
});
