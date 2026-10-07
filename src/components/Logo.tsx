import logo from "@/assets/logo.png";

/**
 * Torii inside the zero: fixed brand colors (sumi ensō and torii, vermilion sun on washi) —
 * does not follow the app's light/dark theme.
 */
export function Logo({ className }: { className?: string }) {
  return <img src={logo} alt="Zerokara" className={className} />;
}
