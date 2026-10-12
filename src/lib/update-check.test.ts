import { describe, expect, it } from "vitest";
import { isNewer } from "./update-check";

describe("isNewer", () => {
  it("compares numerically, not as strings", () => {
    expect(isNewer("v1.0.10", "1.0.9")).toBe(true);
    expect(isNewer("1.0.9", "1.0.10")).toBe(false);
  });
  it("is false for the same version, with or without the v prefix", () => {
    expect(isNewer("v1.0.3", "1.0.3")).toBe(false);
  });
  it("handles minor/major bumps and missing parts", () => {
    expect(isNewer("v1.1.0", "1.0.42")).toBe(true);
    expect(isNewer("v2", "1.9.9")).toBe(true);
  });
});
