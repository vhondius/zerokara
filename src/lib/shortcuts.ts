/**
 * Whether a page-level keyboard shortcut (quiz answer keys, card flips)
 * should handle this key press. Keys belong to what has focus when that's
 * a text field, a dialog (e.g. the report box), or another button or link —
 * there Enter means "type a newline" or "press this", not "next question".
 */
export function shortcutTargetOk(e: KeyboardEvent, allow?: Element | null): boolean {
  const el = e.target as HTMLElement | null;
  if (!el || el === document.body) return true;
  if (allow && allow.contains(el)) return true;
  if (el.closest("[role=dialog]")) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable)
    return false;
  if ((tag === "BUTTON" || tag === "A") && (e.key === "Enter" || e.key === " ")) return false;
  return true;
}
