export type ChangelogEntry = {
  id: number;
  date: string;
  notes: string[];
};

/** Highest `id` in CHANGELOG — doesn't assume the array stays newest-first. */
export function newestChangelogId(): number {
  return CHANGELOG.reduce((max, e) => Math.max(max, e.id), 0);
}

/**
 * Newest first. Bump `id` by 1 whenever a new entry is added — deliberately
 * independent of Android's auto-incrementing build counter (that one bumps
 * on every native build, including ones with no user-facing change).
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 1,
    date: "2026-10-07",
    notes: ["Welcome to Zerokara."],
  },
];
