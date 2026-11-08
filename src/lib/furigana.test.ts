import { describe, expect, it } from "vitest";
import furigana from "@/content/furigana.json";
import { align, piecesFromWords, type FuriganaPiece } from "./furigana-align";

const data = furigana as unknown as Record<string, FuriganaPiece[]> & {
  "#words": Record<string, FuriganaPiece[]>;
};
const show = (pieces: FuriganaPiece[]) =>
  pieces.map((p) => (typeof p === "string" ? p : `${p[0]}(${p[1]})`)).join("");

describe("align", () => {
  it("keeps okurigana outside the reading", () => {
    expect(align("食べる", "たべる")).toEqual([["食", "た"], "べる"]);
    expect(align("取り消し", "とりけし")).toEqual([["取", "と"], "り", ["消", "け"], "し"]);
  });
  it("takes katakana readings and refuses a reading that does not fit", () => {
    expect(align("日本", "ニホン")).toEqual([["日本", "にほん"]]);
    expect(align("食べる", "のむ")).toBeNull();
  });
});

describe("furigana.json", () => {
  it("reads the book's words as the book teaches them", () => {
    expect(data["#words"]["今日"]).toEqual([["今日", "きょう"]]);
  });
  it("spells every string it holds", () => {
    for (const [text, value] of Object.entries(data)) {
      if (text === "#words") continue;
      const pieces = value as FuriganaPiece[];
      expect(pieces.map((p) => (typeof p === "string" ? p : p[0])).join("")).toBe(text);
    }
  });
  it("reads text built at run time from the book's words", () => {
    const words = Object.keys(data["#words"]).sort((a, b) => b.length - a.length);
    expect(show(piecesFromWords("漢字と単語", data["#words"], words))).toBe(
      "漢字(かんじ)と単語(たんご)",
    );
  });
});
