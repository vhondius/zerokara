import { useEffect, type ReactNode } from "react";
import { colorVars } from "@/lib/theme-colors";
import { useTheme } from "./ThemeProvider";

/**
 * The top bar lives outside every page, so a tinted page hands it its band
 * colour through `--obi` on the document root while it's on screen.
 */
export function useObiTint(color: string) {
  const { color: enabled, dark, hydrated } = useTheme();
  const on = hydrated && enabled;
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    const obi = (colorVars(color, dark) as Record<string, string>)["--obi"];
    root.style.setProperty("--obi", obi);
    return () => {
      root.style.removeProperty("--obi");
    };
  }, [on, color, dark]);
}

/**
 * Tints a whole page with a base color when color mode is on.
 * When color mode is off, children render with the default paper/ink tokens.
 */
export function ColorScope({
  color,
  children,
  backdrop,
}: {
  color: string;
  children: ReactNode;
  /** Optional custom background (e.g. a multi-book gradient). */
  backdrop?: string;
}) {
  const { color: enabled, dark, hydrated } = useTheme();
  const on = hydrated && enabled;
  useObiTint(color);

  return (
    <div
      style={
        on
          ? {
              ...colorVars(color, dark),
              backgroundColor: "var(--background)",
              backgroundImage: backdrop
                ? `var(--paper-texture), ${backdrop}`
                : "var(--paper-texture)",
            }
          : undefined
      }
      className="min-h-[calc(100vh-65px)]"
    >
      {children}
    </div>
  );
}

/**
 * Tints a block (e.g. one book on the course overview) without claiming
 * full page height.
 */
export function ColorBlock({
  color,
  children,
  className,
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  const { color: enabled, dark, hydrated } = useTheme();
  const on = hydrated && enabled;
  return (
    <div style={on ? colorVars(color, dark) : undefined} className={className}>
      {children}
    </div>
  );
}
