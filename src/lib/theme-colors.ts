/**
 * Section / book color theming.
 *
 * Each area of the app can be tinted with its own base color. The tint is
 * applied by overriding the semantic design tokens (--background, --card,
 * --muted, --border, --foreground, ...) inside a scoped wrapper, so every
 * existing component picks up the shade automatically.
 *
 * Shades are derived with color-mix so the page background, the "text boxes"
 * (cards) and the muted rows all sit at different strengths of the same hue,
 * while text keeps a high-contrast ink/bone foreground.
 */

export const BOOK_COLORS: Record<string, string> = {
  "jfz-1": "#2e73ae",
  "jfz-2": "#d12231",
  "jfz-3": "#09a14e",
  "jfz-4": "#882889",
  "jfz-5": "#a63963",
};

export const SECTION_COLORS = {
  hiragana: "#D05A2A",
  katakana: "#D05A2A",
  kanji: "#A9C4DF",
  reference: "#FFE79C",
  progress: "#FFDFBA",
} as const;

export function bookColor(bookId: string): string {
  return BOOK_COLORS[bookId] ?? "#2e73ae";
}

/** Ordered book colors, used for the course-overview gradient. */
export function bookGradient(bookIds: string[]): string {
  const stops = bookIds.map(bookColor);
  if (stops.length === 1) stops.push(stops[0]!);
  return `linear-gradient(180deg, ${stops
    .map((c, i) => `color-mix(in oklab, ${c} 18%, transparent) ${(i / (stops.length - 1)) * 100}%`)
    .join(", ")})`;
}

type Vars = Record<string, string>;

/* ---- readable text shades for pale base colours ---- */

type Rgb = [number, number, number];
const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => v * t + b[i] * (1 - t)) as Rgb;
function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const PAPER: Rgb = [248, 246, 240]; // ≈ oklch(0.98 0.008 85)
const INK: Rgb = [59, 47, 39]; // ≈ oklch(0.3 0.03 55)

/**
 * How much of the base colour a text shade can keep (out of `max` percent,
 * the rest being dark ink) and still read at 4.5:1 on the tinted page. Pale
 * section colours (peach Progress, yellow Reference, light-blue Kanji) need a
 * much deeper shade than strong book colours to stay legible.
 */
function readableShare(c: string, max: number): number {
  const base = hexToRgb(c);
  const page = mixRgb(base, PAPER, 0.16);
  for (let pct = max; pct > 0; pct -= 5) {
    if (contrast(mixRgb(base, INK, pct / 100), page) >= 4.8) return pct;
  }
  return 0;
}

/** The top bar's paper band for a page tinted with `c`: the page tint, a little deeper. */
export function obiFor(c: string, dark: boolean): string {
  return `color-mix(in oklab, ${c} 22%, ${dark ? "oklch(0.235 0.016 55)" : "oklch(0.945 0.016 78)"})`;
}

/** Light-mode token overrides for a base color. */
function lightVars(c: string): Vars {
  const primary = readableShare(c, 70);
  const accent = readableShare(c, 78);
  return {
    "--background": `color-mix(in oklab, ${c} 16%, oklch(0.98 0.008 85))`,
    "--obi": obiFor(c, false),
    "--foreground": `color-mix(in oklab, ${c} 20%, oklch(0.19 0.015 55))`,
    "--card": `color-mix(in oklab, ${c} 7%, oklch(0.995 0.005 85))`,
    "--card-foreground": `color-mix(in oklab, ${c} 20%, oklch(0.19 0.015 55))`,
    "--popover": `color-mix(in oklab, ${c} 5%, oklch(0.995 0.005 85))`,
    "--popover-foreground": `color-mix(in oklab, ${c} 20%, oklch(0.19 0.015 55))`,
    "--primary": `color-mix(in oklab, ${c} ${primary}%, oklch(0.3 0.03 55))`,
    "--primary-foreground": `oklch(0.99 0.005 85)`,
    "--secondary": `color-mix(in oklab, ${c} 14%, oklch(0.98 0.008 85))`,
    "--secondary-foreground": `color-mix(in oklab, ${c} 25%, oklch(0.22 0.015 55))`,
    "--muted": `color-mix(in oklab, ${c} 13%, oklch(0.99 0.005 85))`,
    "--muted-foreground": `color-mix(in oklab, ${c} 28%, oklch(0.44 0.02 65))`,
    "--accent": `color-mix(in oklab, ${c} ${accent}%, oklch(0.3 0.04 40))`,
    "--accent-foreground": `oklch(0.99 0.005 85)`,
    "--border": `color-mix(in oklab, ${c} 32%, oklch(0.9 0.015 75))`,
    "--input": `color-mix(in oklab, ${c} 32%, oklch(0.9 0.015 75))`,
    "--ring": `color-mix(in oklab, ${c} 75%, oklch(0.4 0.05 40))`,
  };
}

/** Dark-mode token overrides for a base color. */
function darkVars(c: string): Vars {
  return {
    "--background": `color-mix(in oklab, ${c} 20%, oklch(0.17 0.012 55))`,
    "--obi": obiFor(c, true),
    "--foreground": `color-mix(in oklab, ${c} 10%, oklch(0.95 0.01 85))`,
    "--card": `color-mix(in oklab, ${c} 14%, oklch(0.22 0.014 55))`,
    "--card-foreground": `color-mix(in oklab, ${c} 10%, oklch(0.95 0.01 85))`,
    "--popover": `color-mix(in oklab, ${c} 14%, oklch(0.22 0.014 55))`,
    "--popover-foreground": `color-mix(in oklab, ${c} 10%, oklch(0.95 0.01 85))`,
    "--primary": `color-mix(in oklab, ${c} 35%, oklch(0.94 0.01 85))`,
    "--primary-foreground": `color-mix(in oklab, ${c} 20%, oklch(0.18 0.012 55))`,
    "--secondary": `color-mix(in oklab, ${c} 18%, oklch(0.27 0.015 55))`,
    "--secondary-foreground": `oklch(0.95 0.01 85)`,
    "--muted": `color-mix(in oklab, ${c} 18%, oklch(0.26 0.015 55))`,
    "--muted-foreground": `color-mix(in oklab, ${c} 14%, oklch(0.74 0.015 70))`,
    "--accent": `color-mix(in oklab, ${c} 62%, oklch(0.9 0.02 85))`,
    "--accent-foreground": `oklch(0.18 0.012 55)`,
    "--border": `color-mix(in oklab, ${c} 26%, oklch(0.36 0.02 55))`,
    "--input": `color-mix(in oklab, ${c} 26%, oklch(0.36 0.02 55))`,
    "--ring": `color-mix(in oklab, ${c} 60%, oklch(0.9 0.02 85))`,
  };
}

export function colorVars(base: string, dark: boolean): React.CSSProperties {
  return (dark ? darkVars(base) : lightVars(base)) as React.CSSProperties;
}
