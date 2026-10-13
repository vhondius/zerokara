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
    id: 3,
    date: "2026-10-13",
    notes: [
      "The app now fills the whole screen: the header runs up behind the status bar and the gray band at the bottom is gone.",
    ],
  },
  {
    id: 2,
    date: "2026-10-12",
    notes: [
      "New logo: the torii inside an ink-brush ensō.",
      "The app now checks for updates when it opens and offers to download and install a new version.",
      "Reading-comprehension answers in Books 2 and 3 are now in English.",
      '"On" and "on top of", "in" and "inside" count as the same answer, and so do phone numbers with or without dashes.',
      "Fill-in-the-blank questions with two blanks get one box per blank, and Resubmit now visibly re-checks.",
      "Fixed a batch of reported Book 1–2 exercises: words used before they're taught, missing correct answers, removed letter hints and a corrected stroke-order note.",
    ],
  },
  {
    id: 1,
    date: "2026-10-07",
    notes: ["Welcome to Zerokara."],
  },
];
