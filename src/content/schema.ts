import { z } from "zod";

/**
 * Canonical content schema for a book in the curriculum.
 * A new book = new JSON conforming to this schema. Do NOT add new section
 * types when a book has a quirk — add a new value inside an existing section
 * type's `data`.
 */

export const ExampleSchema = z.object({
  japanese: z.string(),
  romaji: z.string(),
  english: z.string(),
});

export const VocabWordSchema = z.object({
  romaji: z.string(),
  kana: z.string(),
  kanji: z.string().nullable().optional(),
  english: z.string(),
  notes: z.string().optional(),
});

export const KanaCharacterSchema = z.object({
  char: z.string(),
  romaji: z.string().optional(),
  // Kanji-only fields (present when the parent kana_intro section has script="kanji")
  onyomi: z.array(z.string()).optional(),
  kunyomi: z.array(z.string()).optional(),
  meaning: z.string().optional(),
  stroke_count: z.number().int().positive(),
  stroke_order_ref: z.string().optional(),
  audio_ref: z.string().optional(),
  example_words: z.array(ExampleSchema).default([]),
});

export const KanjiEntrySchema = z.object({
  char: z.string(),
  meaning: z.string(),
  onyomi: z.array(z.string()).default([]),
  kunyomi: z.array(z.string()).default([]),
  stroke_count: z.number().int().positive(),
  stroke_order_ref: z.string().optional(),
  introduced_in_unit: z.string().nullable(),
});

/* ---------- Sections (fixed enum) ---------- */

export const GrammarPointSchema = z.object({
  id: z.string(),
  title: z.string(),
  explanation: z.string(),
  examples: z.array(ExampleSchema).default([]),
});

export const VerbConjugationFormSchema = z.object({
  form_name: z.string(),
  kana: z.string(),
  romaji: z.string(),
  english: z.string(),
});

export const VerbTableSchema = z.object({
  dictionary_form: z.string(),
  romaji: z.string(),
  english: z.string(),
  // Books label verb classes differently ("regular"/"irregular" in Book 1,
  // "iru/eru" godan-vs-ichidan style labels in Book 3). Keep this open so a
  // new book's labelling never blocks import; the renderer just displays it.
  verb_type: z.string(),

  conjugations: z.array(VerbConjugationFormSchema),
});

export const ReadingQuestionSchema = z.object({
  prompt: z.string(),
  answer: z.union([z.string(), z.array(z.string())]).nullable(),
});

export const MiniConversationLineSchema = z.object({
  speaker: z.string(),
  japanese: z.union([z.string(), z.array(z.string())]),
  english: z.union([z.string(), z.array(z.string())]),
});

export const ExerciseSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "fill_blank",
    "translate",
    "matching",
    "multiple_choice",
    "writing_practice",
    "dialogue_translation",
    "reading_comprehension",
    "mini_conversation",
  ]),
  prompt: z.string().optional().default(""),
  answer: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  options: z.array(z.string()).nullable().optional(),
  hint: z.string().optional(),
  // Excludes an otherwise well-formed exercise from book-test sampling —
  // e.g. one that depends on context a random sample wouldn't carry along.
  excludeFromTest: z.boolean().optional(),
  // reading_comprehension
  passage: z.string().optional(),
  questions: z.array(ReadingQuestionSchema).optional(),
  // mini_conversation
  lines: z.array(MiniConversationLineSchema).optional(),
  direction: z.enum(["j-to-e", "e-to-j"]).optional(),
  // Set when the prompt itself is a picture (e.g. "visual clue" exercises) —
  // a root-relative path into public/, e.g. "/images/jfz-5/lesson-01-kanji-drill-1.png".
  image_ref: z.string().optional(),
  // Multi-answer questions (e.g. "one you like, one you dislike", or a
  // two-person exchange to write) — one labelled answer box per part.
  parts: z
    .array(
      z.object({
        label: z.string(),
        answer: z.union([z.string(), z.array(z.string())]),
      }),
    )
    .optional(),
});

const base = <TType extends string, TData extends z.ZodTypeAny>(type: TType, data: TData) =>
  z.object({
    type: z.literal(type),
    title: z.string().optional(),
    data,
  });

export const SectionSchema = z.discriminatedUnion("type", [
  base("culture_clip", z.object({ body: z.string() })),
  base("cool_tools", z.object({ body: z.string() })),
  base(
    "grammar",
    z.object({
      points: z.array(GrammarPointSchema),
      verb_tables: z.array(VerbTableSchema).optional(),
    }),
  ),

  base(
    "speaking_naturally",
    z.object({
      notes: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })),
    }),
  ),
  base(
    "word_usage",
    z.object({
      body: z.string().optional(),
      examples: z.array(ExampleSchema).default([]),
      notes: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).default([]),
    }),
  ),
  base(
    "special_usage",
    z.object({
      body: z.string().optional(),
      examples: z.array(ExampleSchema).default([]),
      notes: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).default([]),
    }),
  ),
  base("new_adjectives", z.object({ words: z.array(VocabWordSchema) })),
  base(
    "kana_intro",
    z.object({
      script: z.enum(["hiragana", "katakana", "kanji"]),
      characters: z.array(KanaCharacterSchema),
    }),
  ),
  base(
    "writing_points",
    z.object({
      notes: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })),
    }),
  ),
  base(
    "vocabulary_groups",
    z.object({
      groups: z.array(z.object({ theme: z.string(), words: z.array(VocabWordSchema) })),
    }),
  ),
  base("lesson_activities", z.object({ exercises: z.array(ExerciseSchema) })),
  base("sentence_building", z.object({ prompts: z.array(z.string()) })),
  base("answer_key", z.object({ answers_for: z.string() })),
]);

export const UnitSchema = z.object({
  id: z.string(),
  book_id: z.string(),
  type: z.enum(["pre-lesson", "lesson", "kanji-lesson"]),
  label: z.string(),
  title: z.string(),
  order_index: z.number().int().nonnegative(),
  sections: z.array(SectionSchema),
});

export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.number().int().positive(),
  authors: z.array(z.string()).default([]),
  unit_order: z.array(z.enum(["pre-lesson", "lesson", "kanji-lesson"])),
  units: z.array(UnitSchema).default([]),
  kanji_entries: z.array(KanjiEntrySchema).default([]),
});

export type Example = z.infer<typeof ExampleSchema>;
export type VocabWord = z.infer<typeof VocabWordSchema>;
export type KanaCharacter = z.infer<typeof KanaCharacterSchema>;
export type KanjiEntry = z.infer<typeof KanjiEntrySchema>;
export type GrammarPoint = z.infer<typeof GrammarPointSchema>;
export type VerbConjugationForm = z.infer<typeof VerbConjugationFormSchema>;
export type VerbTable = z.infer<typeof VerbTableSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];
export type Unit = z.infer<typeof UnitSchema>;
export type Book = z.infer<typeof BookSchema>;
