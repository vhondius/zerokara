import { useEffect, useRef, useState } from "react";
import type { KanaEntry, PracticeScript } from "@/lib/kana-index";
import { entryAnswer } from "@/lib/kana-index";
import { ReportButton } from "@/components/lesson/ReportButton";
import { useTheme } from "@/components/theme/ThemeProvider";

type Mode = "animate" | "quiz";

type KanaSvgStroke = { id: string; value: string };
type KanaSvgMedian = { id: string; value: number[][] };
type KanaSvgData = { charCode: number; strokes: KanaSvgStroke[]; medians?: KanaSvgMedian[] };

type LoadedChar = { strokes: string[]; medians: number[][][] };
const cache = new Map<string, LoadedChar>();

/**
 * kana-svg-data authors paths in standard SVG y-down space (small y = top of glyph).
 * hanzi-writer expects Make-Me-a-Hanzi font-coordinate data (y-up, baseline at y=0)
 * and applies its own scale(1,-1) around y=GLYPH_HEIGHT at render time. Without a
 * pre-flip, that render-time transform lands the character upside down.
 *
 * Fix once at the data-mapping layer so the renderer's flip cancels out.
 * GLYPH_HEIGHT=900 matches Hanzi Writer's default TRANSFORM_DATA scale.
 */
const GLYPH_HEIGHT = 900;

/** Flip Y for every coordinate in an SVG path 'd' string. */
function flipPathY(d: string, H = GLYPH_HEIGHT): string {
  const CMD_ARGS: Record<string, number> = {
    M: 2,
    L: 2,
    T: 2,
    C: 6,
    S: 4,
    Q: 4,
    A: 7,
    H: 1,
    V: 1,
    Z: 0,
  };
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let cmd = tokens[i++];
    const isAbs = cmd === cmd.toUpperCase();
    let base = cmd.toUpperCase();
    let n = CMD_ARGS[base] ?? 0;
    out.push(cmd);
    if (n === 0) continue;
    let first = true;
    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
      const args = tokens.slice(i, i + n).map(Number);
      i += n;
      if (base === "H") {
        // x only — unchanged
      } else if (base === "V") {
        args[0] = isAbs ? H - args[0] : -args[0];
      } else if (base === "A") {
        // rx ry x-rot large-arc sweep x y
        args[6] = isAbs ? H - args[6] : -args[6];
        args[4] = args[4] === 1 ? 0 : 1; // sweep flag flips under Y reflection
      } else {
        for (let k = 1; k < n; k += 2) {
          args[k] = isAbs ? H - args[k] : -args[k];
        }
      }
      out.push(args.join(" "));
      // After the first M/m, subsequent implicit pairs are L/l.
      if (first && base === "M") {
        base = "L";
        cmd = isAbs ? "L" : "l";
        n = 2;
        first = false;
      }
    }
  }
  return out.join(" ");
}

/** Locally bundled stroke dataset (public/data/kana-strokes.json) — no network needed. */
type KanaDataset = Record<"hiragana" | "katakana", Record<string, KanaSvgData>>;
let datasetPromise: Promise<KanaDataset> | null = null;
function loadDataset(): Promise<KanaDataset> {
  if (!datasetPromise) {
    datasetPromise = fetch("/data/kana-strokes.json").then((res) => {
      if (!res.ok) throw new Error("Failed to load bundled kana stroke data");
      return res.json() as Promise<KanaDataset>;
    });
  }
  return datasetPromise;
}

/**
 * Locally bundled kanji stroke data in Japanese stroke order
 * (public/data/kanji-strokes.json, built by scripts/build-kanji-strokes.mjs
 * from AnimCJK). Already in Hanzi Writer's y-up space, so no flip needed.
 */
type StrokeData = { strokes: string[]; medians: number[][][] };
let kanjiPromise: Promise<Record<string, StrokeData>> | null = null;
function loadKanjiData(char: string): Promise<StrokeData | undefined> {
  if (!kanjiPromise) {
    kanjiPromise = fetch("/data/kanji-strokes.json").then((res) => {
      if (!res.ok) throw new Error("Failed to load bundled kanji stroke data");
      return res.json() as Promise<Record<string, StrokeData>>;
    });
  }
  return kanjiPromise.then((all) => all[char]);
}

/**
 * Hanzi Writer only understands hex/rgb colours, while the theme tokens are
 * oklch(). Resolve a token to rgb() by painting it on a 1px canvas.
 */
function themeColor(token: string, fallback: string): string {
  try {
    const probe = document.createElement("span");
    document.body.appendChild(probe);
    probe.style.color = "var(--background)";
    const page = getComputedStyle(probe).color;
    probe.style.color = `var(${token})`;
    const css = getComputedStyle(probe).color;
    probe.remove();
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    // Paint the page colour first: some tokens are translucent (the border
    // is white at 10% in dark mode) and must be blended, not read as opaque.
    ctx.fillStyle = page;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fallback;
  }
}

/**
 * kana-svg-data authors a self-intersecting outline (a loop/curve stroke,
 * e.g. め/よ/ぬ/あ) as multiple SVG-path ids sharing a numeric prefix
 * ("2a"/"2b") — a rendering split, not a second pen stroke. Group those
 * fragments back into one logical stroke so Hanzi Writer's quiz expects
 * exactly one pointerdown→pointerup gesture per real stroke, matching how a
 * learner actually draws it. A trailing letter suffix marks a fragment;
 * consecutive fragments sharing a numeric prefix belong to the same group.
 * Returns groups of indices into the original `strokes`/`medians` arrays.
 */
function strokeGroupKey(id: string): string {
  return id.replace(/[a-zA-Z]+$/, "");
}

function groupStrokeIndices(ids: string[]): number[][] {
  const groups: number[][] = [];
  let lastKey: string | null = null;
  ids.forEach((id, i) => {
    const key = strokeGroupKey(id);
    if (key === lastKey && groups.length > 0) {
      groups[groups.length - 1].push(i);
    } else {
      groups.push([i]);
    }
    lastKey = key;
  });
  return groups;
}

/** Euclidean length of a polyline; used to pick a grouped stroke's spine. */
function polylineLength(pts: number[][]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    total += Math.hypot(x1 - x0, y1 - y0);
  }
  return total;
}

async function loadKanaSvg(char: string, script: "hiragana" | "katakana"): Promise<LoadedChar> {
  const key = `${script}:${char}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const dataset = await loadDataset();
  const data: KanaSvgData | undefined = dataset[script]?.[char];
  if (!data) throw new Error(`Failed to load stroke data for ${char}`);

  // Repair each fragment's median on its own terms first — a fragment's
  // authored median is either trustworthy or it isn't, independent of
  // whether it ends up sharing a rendered stroke with a sibling fragment.
  const fragmentPaths = data.strokes.map((s) => s.value);
  const hasMedians = !!data.medians && data.medians.length === data.strokes.length;
  const authoredFragmentMedians = data.strokes.map((_, i) =>
    hasMedians ? data.medians![i].value : null,
  );
  const repairedFragmentMedians = repairMedians(fragmentPaths, authoredFragmentMedians);

  const groups = groupStrokeIndices(data.strokes.map((s) => s.id));
  const rawPaths = groups.map((idxs) => idxs.map((i) => fragmentPaths[i]).join(" "));
  const strokes = rawPaths.map((d) => flipPathY(d));
  // A grouped stroke's fragments come in two shapes: either near-duplicate
  // skeletons of the *same* whole loop (e.g. あ's "3a"/"3b" — concatenating
  // them end to end doubled the spine's length and inserted a spurious jump
  // back to the next fragment's start, corrupting getStartingPoint/
  // getEndingPoint/direction/arc-length), or — less obviously — genuinely
  // complementary pieces of one continuous stroke where only ONE fragment's
  // authored median actually spans the whole thing (e.g. お's "2a" median
  // runs stem-then-loop end to end, while "2b" is corrupted data whose only
  // fallback is resampling *that fragment's own render outline*, which for
  // お covers just the loop ring — picking "2b" as the spine silently drops
  // the stem from both rendering and quiz matching). A resampled-from-path
  // fallback is only ever a proxy for its own fragment's rendered shape, not
  // for the group's full stroke, so it's never a safe pick when an
  // authored (uncorrupted) sibling is available — prefer any such trusted
  // fragment over a resampled one, and only fall back to comparing lengths
  // (or resampled data) when no fragment in the group has trustworthy
  // authored data. Ties among equally-trusted fragments (or among
  // resampled ones, if that's all there is) go to the longest, since
  // sibling fragments' lengths are otherwise equal or within ~11% of each
  // other across the dataset. The render path above still uses every
  // fragment — only the quiz-matching spine changes here.
  const isTrustedFragment = data.strokes.map((_, i) => {
    const median = authoredFragmentMedians[i];
    return !!median && !isMedianCorrupted(median);
  });
  const rawMedians = groups.map((idxs) => {
    const trusted = idxs.filter((i) => isTrustedFragment[i]);
    const candidates = (trusted.length > 0 ? trusted : idxs).map((i) => repairedFragmentMedians[i]);
    return candidates.reduce((longest, m) =>
      polylineLength(m) > polylineLength(longest) ? m : longest,
    );
  });
  const medians = rawMedians.map((pts) => pts.map(([x, y]) => [x, GLYPH_HEIGHT - y]));

  const result = { strokes, medians };
  cache.set(key, result);
  return result;
}

// Every legitimate median point across the whole kana-strokes.json dataset
// falls within y 36–1024; every known-corrupted point falls within
// y 1058–1722 — a wide, validated, zero-false-positive gap. Margins here
// are generous on both sides of that gap.
const MEDIAN_Y_MIN = -100;
const MEDIAN_Y_MAX = GLYPH_HEIGHT + 150;

/**
 * Authored medians for kana-svg-data strokes are sometimes corrupted: a
 * fragment's points get replaced with data far outside the dataset's own
 * glyph coordinate space. That makes Hanzi Writer's quiz matcher (which
 * checks strictly against these points) effectively unreachable, so the
 * quiz gets stuck forever — and since the same points also drive the
 * visible clipped stroke render, it leaves part of the stroke uncovered.
 */
function isMedianCorrupted(median: number[][]): boolean {
  return median.some(([, y]) => y < MEDIAN_Y_MIN || y > MEDIAN_Y_MAX);
}

/** Validate authored medians against each stroke's own outline; resample any that look corrupted. */
function repairMedians(paths: string[], authored: (number[][] | null)[]): number[][][] {
  const resampled = sampleMedians(paths);
  return authored.map((median, i) =>
    !median || isMedianCorrupted(median) ? resampled[i] : median,
  );
}

/** Sample midpoints along an SVG path (client-only; needs DOM). Input is raw y-down. */
function sampleMedians(paths: string[], samples = 8): number[][][] {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.appendChild(svg);
  try {
    return paths.map((d) => {
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
      const len = p.getTotalLength();
      const pts: number[][] = [];
      for (let i = 0; i <= samples; i++) {
        const pt = p.getPointAtLength((len * i) / samples);
        pts.push([Math.round(pt.x), Math.round(pt.y)]);
      }
      svg.removeChild(p);
      return pts;
    });
  } finally {
    document.body.removeChild(svg);
  }
}

export function StrokeTrace({ entries }: { entries: KanaEntry[] }) {
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>("animate");
  const { hideCharacterInTrace, setHideCharacterInTrace } = useTheme();
  const hideCharacter = hideCharacterInTrace && mode === "quiz";

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No characters in this filter yet.
      </div>
    );
  }

  const entry = entries[i % entries.length];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="jp text-4xl text-accent" aria-hidden={hideCharacter}>
            {hideCharacter ? "?" : entry.char}
          </span>
          <span className="font-display text-2xl text-foreground">{entryAnswer(entry)}</span>
          <span className="text-xs text-muted-foreground">{entry.stroke_count} strokes</span>
          <ReportButton
            sectionType={`practice_${entry.script}_trace`}
            itemType={entry.script === "kanji" ? "kanji_character" : "kana_character"}
            itemId={entry.char}
            label={`${entry.char} · ${entryAnswer(entry)}`}
            snapshot={entry}
            context={{
              bookId: entry.bookId,
              unitId: entry.unitId,
              unitLabel: entry.unitLabel,
              unitTitle: entry.unitTitle,
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
            {(["animate", "quiz"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1.5 transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "animate" ? "Watch strokes" : "Trace it"}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={mode !== "quiz"}
            onClick={() => setHideCharacterInTrace(!hideCharacterInTrace)}
            title={
              mode !== "quiz"
                ? "Switch to Trace it to hide the character"
                : hideCharacterInTrace
                  ? "Show the character again"
                  : "Hide the character while tracing"
            }
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              hideCharacterInTrace && mode === "quiz"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {hideCharacterInTrace ? "Character hidden" : "Hide character"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-3">
        {Array.from(entry.char).map((glyph, gi) => (
          <TraceCanvas
            key={`${entry.char}-${gi}-${mode}`}
            char={glyph}
            script={entry.script}
            mode={mode}
            hideCharacter={hideCharacter}
            compact={entry.char.length > 1}
          />
        ))}
      </div>
      {entry.char.length > 1 ? (
        <p className="text-center text-xs text-muted-foreground">
          Compound kana — practice each glyph, then read them together as{" "}
          <span className="jp text-foreground">{entry.char}</span>.
        </p>
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Introduced in{" "}
          <span className="text-foreground">
            {entry.unitLabel} — {entry.unitTitle}
          </span>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setI((n) => (n - 1 + entries.length) % entries.length)}
            className="rounded-md border border-input bg-background px-3 py-1.5 hover:bg-muted"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setI((n) => (n + 1) % entries.length)}
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function TraceCanvas({
  char,
  script,
  mode,
  hideCharacter,
  compact = false,
}: {
  char: string;
  script: PracticeScript;
  mode: Mode;
  hideCharacter: boolean;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const size = compact ? 240 : 300;
  const { dark } = useTheme();

  useEffect(() => {
    let cancelled = false;
    let writer: { quiz?: () => void; animateCharacter?: () => void } | null = null;

    (async () => {
      try {
        // Both kana and kanji load from bundled data, so tracing works
        // offline; kana need the kana-svg-data Y pre-flip, kanji don't.
        const isKanji = script === "kanji";
        const [{ default: HanziWriter }, data] = await Promise.all([
          import("hanzi-writer"),
          isKanji ? loadKanjiData(char) : loadKanaSvg(char, script),
        ]);
        if (cancelled || !hostRef.current) return;
        if (!data) {
          setStatus("error");
          return;
        }

        hostRef.current.innerHTML = "";
        writer = HanziWriter.create(hostRef.current, char, {
          width: size,
          height: size,
          padding: 8,
          strokeAnimationSpeed: 1.1,
          delayBetweenStrokes: 220,
          showCharacter: mode === "animate",
          showOutline: !hideCharacter,
          showHintAfterMisses: hideCharacter ? false : 3,
          highlightOnComplete: !hideCharacter,
          // From the theme, so the character stays visible in dark mode.
          strokeColor: themeColor("--foreground", "#1a1a1a"),
          outlineColor: themeColor("--border", "#d4c9b8"),
          highlightColor: themeColor("--accent", "#c86a3b"),
          drawingColor: themeColor("--accent", "#c86a3b"),
          charDataLoader: (_c: string, onComplete: unknown) => {
            (onComplete as (d: unknown) => void)({
              strokes: data.strokes,
              medians: data.medians,
            });
          },
          onLoadCharDataError: () => {
            if (!cancelled) setStatus("error");
          },
        });

        if (mode === "animate") {
          writer?.animateCharacter?.();
        } else {
          writer?.quiz?.();
        }
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [char, script, mode, hideCharacter, size, dark]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card shadow-sheet p-6">
      <div
        ref={hostRef}
        className={`flex items-center justify-center rounded-lg bg-background ${compact ? "h-[240px] w-[240px]" : "h-[300px] w-[300px]"}`}
      />
      <p className={`text-center text-xs text-muted-foreground ${compact ? "max-w-[240px]" : ""}`}>
        {status === "loading"
          ? "Loading stroke data…"
          : status === "error"
            ? "Couldn't load stroke data for this character."
            : mode === "animate"
              ? "Watch the stroke order, then switch to Trace it."
              : "Draw each stroke on the grid. Each one is checked as you go."}
      </p>
    </div>
  );
}
