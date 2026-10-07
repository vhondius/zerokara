import { z } from "zod";

export const PhraseEntrySchema = z.object({
  english: z.string(),
  japanese: z.string(),
  note: z.string().optional(),
});

export const PhraseCategorySchema = z.object({
  category: z.string(),
  entries: z.array(PhraseEntrySchema),
});

export const ReferenceSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  categories: z.array(PhraseCategorySchema),
});

export const ReferenceBookSchema = z.object({
  book_id: z.string(),
  reference_sections: z.array(ReferenceSectionSchema),
});

export type PhraseEntry = z.infer<typeof PhraseEntrySchema>;
export type PhraseCategory = z.infer<typeof PhraseCategorySchema>;
export type ReferenceSection = z.infer<typeof ReferenceSectionSchema>;
export type ReferenceBook = z.infer<typeof ReferenceBookSchema>;

import phrasesJson from "./jfz-1-phrases.json";

export const jfz1Phrases: ReferenceBook = ReferenceBookSchema.parse(phrasesJson);
