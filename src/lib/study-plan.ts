import { localDate } from "@/lib/progress-store";

/**
 * What the learner did on each day ("lesson": answered exercises; "review":
 * rated spaced-repetition cards), kept for the last few months. Drives the
 * daily plan: with the "alternate" pattern, a lesson day is followed by a
 * review day and the other way round.
 */
const DAY_LOG_KEY = "zerokara.daylog.v1";
const KEEP_DAYS = 90;

export type DayKind = "lesson" | "review";
type DayLog = Record<string, { lesson?: boolean; review?: boolean }>;

function readLog(): DayLog {
  if (typeof window === "undefined") return {};
  try {
    const log = JSON.parse(window.localStorage.getItem(DAY_LOG_KEY) ?? "{}");
    return log && typeof log === "object" && !Array.isArray(log) ? log : {};
  } catch {
    return {};
  }
}

export function markDay(kind: DayKind) {
  if (typeof window === "undefined") return;
  const log = readLog();
  const today = localDate();
  if (log[today]?.[kind]) return;
  log[today] = { ...log[today], [kind]: true };
  const keep = Object.keys(log).sort().slice(-KEEP_DAYS);
  try {
    window.localStorage.setItem(
      DAY_LOG_KEY,
      JSON.stringify(Object.fromEntries(keep.map((d) => [d, log[d]]))),
    );
  } catch {
    /* the plan just falls back to "both" */
  }
}

/** The most recent study day before `date`, and what was done on it. */
function lastDayBefore(
  date: string,
): { date: string; lesson: boolean; review: boolean } | undefined {
  const log = readLog();
  const days = Object.keys(log)
    .filter((d) => d < date && (log[d].lesson || log[d].review))
    .sort();
  const last = days[days.length - 1];
  return last ? { date: last, lesson: !!log[last].lesson, review: !!log[last].review } : undefined;
}

/**
 * Today's suggestion. With "alternate": the opposite of the last study day
 * (a day with both counts as a lesson day, so the next one reviews). Before
 * any history, it's a lesson day. "both" suggests both every day.
 */
export function planFor(pattern: "alternate" | "both", date = localDate()): DayKind | "both" {
  if (pattern === "both") return "both";
  const last = lastDayBefore(date);
  if (!last) return "lesson";
  return last.lesson ? "review" : "lesson";
}

/** Whole days since the last study day before today, or null if there's none. */
export function daysAway(today = localDate()): number | null {
  const last = lastDayBefore(today);
  if (!last) return null;
  const [y1, m1, d1] = last.date.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}
