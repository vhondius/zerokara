import { useMemo, useState } from "react";
import { allHiragana, allKatakana } from "@/lib/kana-index";
import { allVocabulary, vocabId } from "@/lib/vocab-index";
import { useCompletedUnits } from "@/hooks/use-completed-units";
import { useReviewSession } from "@/hooks/use-srs";
import { ColorScope } from "@/components/theme/ColorScope";
import { SECTION_COLORS } from "@/lib/theme-colors";
import {
  ReviewFlashcards,
  kanaReviewCards,
  vocabReviewCards,
  type ReviewCard,
} from "./ReviewFlashcards";

/**
 * One blended Anki-style deck across vocabulary, hiragana, and katakana —
 * always scoped to what's been introduced by a completed unit. Kanji isn't
 * part of this deck (its own SRS data keeps accumulating, just unsurfaced).
 */
export function ReviewPractice() {
  const completed = useCompletedUnits();

  const vocab = useMemo(
    () => allVocabulary().filter((w) => completed.has(`${w.bookId}:${w.unitId}`)),
    [completed],
  );
  const hiragana = useMemo(
    () => allHiragana().filter((e) => completed.has(`${e.bookId}:${e.unitId}`)),
    [completed],
  );
  const katakana = useMemo(
    () => allKatakana().filter((e) => completed.has(`${e.bookId}:${e.unitId}`)),
    [completed],
  );

  const vocabSession = useReviewSession(vocab, "vocabulary", vocabId);
  const hiraganaSession = useReviewSession(hiragana, "kana", (k) => k.char);
  const katakanaSession = useReviewSession(katakana, "kana", (k) => k.char);
  const [sessionKey, setSessionKey] = useState(0);

  const cards: ReviewCard[] = [
    ...vocabReviewCards(vocabSession.cards),
    ...kanaReviewCards(hiraganaSession.cards, "kana"),
    ...kanaReviewCards(katakanaSession.cards, "kana"),
  ];
  const due = vocabSession.due + hiraganaSession.due + katakanaSession.due;
  const fresh = vocabSession.fresh + hiraganaSession.fresh + katakanaSession.fresh;

  return (
    <ColorScope color={SECTION_COLORS.review}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-baseline gap-4">
          <span className="jp text-5xl text-accent">復習</span>
          <h1 className="font-display text-4xl text-foreground">Review</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Spaced review for vocabulary, hiragana, and katakana you've already learned.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {cards.length} card{cards.length === 1 ? "" : "s"} today — {due} due, {fresh} new.
        </p>

        <div className="mt-8">
          <ReviewFlashcards
            key={sessionKey}
            cards={cards}
            onRestart={() => setSessionKey((k) => k + 1)}
          />
        </div>
      </div>
    </ColorScope>
  );
}
