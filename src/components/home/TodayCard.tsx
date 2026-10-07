import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useProgressTick } from "@/hooks/use-unit-progress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { buildReviewSession } from "@/hooks/use-srs";
import { bookStatus, currentBook } from "@/lib/book-progress";
import { getState } from "@/lib/progress-store";
import { allHiragana, allKanji, allKatakana } from "@/lib/kana-index";
import { allVocabulary, vocabId } from "@/lib/vocab-index";
import { daysAway, planFor } from "@/lib/study-plan";

const WELCOME_KEY = "zerokara.welcome.v1";
const AWAY_DAYS = 7;

/** First visit: what the course is and where to start. Dismissed for good once closed. */
export function FirstRunCard() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(WELCOME_KEY);
      const hasProgress = Object.keys(getState().units).length > 0;
      setShow(!seen && !hasProgress);
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* it'll just show again next time */
    }
  };
  return (
    <div className="mt-8 rounded-xl border border-accent/50 bg-card shadow-sheet p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-xl text-foreground">How this works</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>Start here: 5 short pre-lessons in romaji, then Lesson 1 teaches あいうえお.</li>
        <li>Each unit is done when every exercise in it has been answered.</li>
        <li>
          Finish a book and pass its test to open the next one, or test out if you already know it.
        </li>
      </ul>
      <Link
        to="/learn"
        onClick={dismiss}
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Start with Pre-lesson A →
      </Link>
    </div>
  );
}

/**
 * Today's plan: a lesson day or a review day (alternating, per Settings →
 * Study), plus a welcome back after a week or more away. A suggestion only:
 * both stay available.
 */
export function TodayCard() {
  const { hydrated } = useProgressTick();
  const { study } = useTheme();
  if (!hydrated) return null;

  const state = getState();
  if (Object.keys(state.units).length === 0) return null; // the first-run card covers this

  const done = (e: { bookId: string; unitId: string }) =>
    !!state.units[`${e.bookId}:${e.unitId}`]?.completed;
  const decks = [
    {
      to: "/practice/hiragana" as const,
      n: buildReviewSession(allHiragana().filter(done), "kana", (k) => k.char, study).cards.length,
    },
    {
      to: "/practice/katakana" as const,
      n: buildReviewSession(allKatakana().filter(done), "kana", (k) => k.char, study).cards.length,
    },
    {
      to: "/practice/kanji" as const,
      n: buildReviewSession(allKanji().filter(done), "kanji", (k) => k.char, study).cards.length,
    },
    {
      to: "/practice/vocabulary" as const,
      n: buildReviewSession(allVocabulary().filter(done), "vocabulary", vocabId, study).cards
        .length,
    },
  ];
  const reviewTotal = decks.reduce((a, d) => a + d.n, 0);
  const reviewDeck = [...decks].sort((a, b) => b.n - a.n)[0];

  const book = currentBook();
  const next = book ? bookStatus(book).firstIncomplete : undefined;

  const plan = planFor(study.pattern);
  const away = daysAway();
  const welcomeBack = away !== null && away >= AWAY_DAYS;
  // Nothing to review means it's a lesson day after all.
  const today = plan === "review" && reviewTotal === 0 ? "lesson" : plan;

  const lessonLink =
    book && next ? (
      <Link
        to="/learn/$bookId/$unitId"
        params={{ bookId: book.id, unitId: next.id }}
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Continue: {next.label} →
      </Link>
    ) : book ? (
      <Link
        to="/learn/$bookId/test"
        params={{ bookId: book.id }}
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Take the {book.title} test →
      </Link>
    ) : null;
  const reviewLink =
    reviewTotal > 0 ? (
      <Link
        to={reviewDeck.to}
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Review {reviewTotal} card{reviewTotal === 1 ? "" : "s"} →
      </Link>
    ) : null;
  // On a review day the lesson stays one tap away.
  const lessonAside =
    book && next ? (
      <Link
        to="/learn/$bookId/$unitId"
        params={{ bookId: book.id, unitId: next.id }}
        className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        or continue {next.label}
      </Link>
    ) : null;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card shadow-sheet p-5">
      {welcomeBack ? (
        <>
          <p className="font-display text-xl text-foreground">Welcome back!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It's been {away} days. {next ? `You were on ${next.label} — ${next.title}. ` : ""}
            {reviewTotal > 0
              ? `Start with a short review of ${reviewTotal} cards; the rest of the backlog comes back over the next few days.`
              : "Pick up where you left off."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">{reviewLink ?? lessonLink}</div>
        </>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-accent">Today</p>
          <p className="mt-1 font-display text-xl text-foreground">
            {today === "review"
              ? "Review day"
              : today === "lesson"
                ? "Lesson day"
                : "Lesson and review"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {today === "review"
              ? `Strengthen what you've learned: ${reviewTotal} card${reviewTotal === 1 ? "" : "s"} ready.`
              : today === "lesson"
                ? next
                  ? `Next up: ${next.label} — ${next.title}.`
                  : "Every unit is done — time for the book test."
                : `${next ? `Next up: ${next.label}. ` : ""}${reviewTotal} card${reviewTotal === 1 ? "" : "s"} to review.`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {today === "review" ? reviewLink : lessonLink}
            {today === "both" ? reviewLink : null}
            {today === "review" ? lessonAside : null}
          </div>
        </>
      )}
    </div>
  );
}
