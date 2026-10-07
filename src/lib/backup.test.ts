import { describe, expect, it } from "vitest";
import { backupEntries, importBackup } from "./backup";

describe("backupEntries", () => {
  it("keeps app keys and drops foreign keys", () => {
    const entries = backupEntries({
      format: 1,
      data: { "zerokara.theme.v1": "x", other: "y" },
    });
    expect(Object.fromEntries(entries)).toEqual({ "zerokara.theme.v1": "x" });
  });

  it("rejects files that aren't backups", () => {
    expect(() => backupEntries({ foo: 1 })).toThrow();
    expect(() => backupEntries({ format: 1, data: { other: "y" } })).toThrow();
  });
});

describe("importBackup", () => {
  it("replaces all app keys and leaves other keys alone", async () => {
    const store = new Map([
      ["zerokara.test-draft.jfz-1", "stale"],
      ["other", "keep"],
    ]);
    const localStorage = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    (globalThis as { window?: unknown }).window = { localStorage };
    const file = new File(
      [JSON.stringify({ format: 1, data: { "zerokara.progress.v1": "{}" } })],
      "backup.json",
    );
    await importBackup(file);
    expect(Object.fromEntries(store)).toEqual({ other: "keep", "zerokara.progress.v1": "{}" });
  });
});
