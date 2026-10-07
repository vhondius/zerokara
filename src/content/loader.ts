import { BookSchema, type Book } from "./schema";

/**
 * Accepts either:
 *  - a Book object matching the canonical schema, or
 *  - a "flat" authoring shape: { book, units, kanji_entries }, where each
 *    section is `{ type, title?, ...fields }` instead of
 *    `{ type, title?, data: {...fields} }`.
 *
 * Normalises the flat shape into the canonical schema, validates with Zod,
 * and throws a readable error on drift.
 */
export function loadBook(input: unknown): Book {
  const normalised = normalise(input);
  const result = BookSchema.safeParse(normalised);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Book JSON failed schema validation:\n${issues}`);
  }
  return result.data;
}

function normalise(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;

  // Flat authoring shape → canonical Book
  if ("book" in obj && "units" in obj) {
    const book = obj.book as Record<string, unknown>;
    return {
      ...book,
      units: (obj.units as unknown[]).map(normaliseUnit),
      kanji_entries: obj.kanji_entries ?? [],
    };
  }

  // Already canonical, but sections may still be flat
  if (Array.isArray((obj as { units?: unknown }).units)) {
    return {
      ...obj,
      units: (obj.units as unknown[]).map(normaliseUnit),
    };
  }
  return obj;
}

function normaliseUnit(u: unknown): unknown {
  if (!u || typeof u !== "object") return u;
  const unit = u as Record<string, unknown>;
  const sections = Array.isArray(unit.sections)
    ? (unit.sections as unknown[]).map(normaliseSection)
    : [];
  return { ...unit, sections };
}

function normaliseSection(s: unknown): unknown {
  if (!s || typeof s !== "object") return s;
  const sec = s as Record<string, unknown>;
  if ("data" in sec) return sec;
  const { type, title, ...rest } = sec;
  return { type, title, data: rest };
}
