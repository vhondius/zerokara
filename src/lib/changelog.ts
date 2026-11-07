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
    id: 6,
    date: "2026-11-08",
    notes: [
      "New setting: Hiragana above kanji. Lessons, examples, dialogues and reading passages show the reading over each kanji. Questions and answer choices only show it once you've answered, and vocabulary tables and word cards keep their own reading column.",
      "Review and flashcards no longer flash the next card's answer for a moment after you rate or move on.",
    ],
  },
  {
    id: 5,
    date: "2026-11-05",
    notes: [
      "Clearing a number box in Settings no longer saves 0, so you can't turn off new cards by accident while typing a new value.",
      "Review now tells you why it's empty: new cards are set to 0 per day, or you've reached today's limit.",
      'The Today card now shows what\'s left in a part-done lesson, such as "Finish Lesson 5: 1 exercise left".',
      'The particle を now reads "o" in lesson text. The kana chart keeps "wo", and you can type either spelling in answers.',
      "Reminders now use the Zerokara torii and ensō as their notification icon instead of a generic bell.",
    ],
  },
  {
    id: 4,
    date: "2026-10-19",
    notes: [
      "Navigation is now Course, Practice, and Review instead of Course and Practice.",
      "Review is a dedicated, Anki-style deck blending vocabulary, hiragana, and katakana you've already learned, picked up where you left off each day.",
      "Practice no longer has a separate review mode inside each category — it's flashcards, quizzes, and stroke tracing only; spaced review now lives in the new Review tab.",
    ],
  },
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
