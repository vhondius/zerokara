import { useEffect } from "react";
import { didStudyToday, getLastActivityDate, localDate, subscribe } from "@/lib/progress-store";
import { planFor } from "@/lib/study-plan";
import { useTheme } from "@/components/theme/ThemeProvider";

const LAST_NOTIFIED_KEY = "zerokara.lastNotified.v1";
export const REMINDER_TEXT = "Don't forget to learn Japanese today!";
export const REMINDER_TITLE = "Zerokara";

/** Reminder text naming the day's plan (Settings → Study), for the day it fires. */
export function reminderText(pattern: "alternate" | "both", at: Date = new Date()): string {
  const plan = planFor(pattern, localDate(at));
  if (plan === "review") return "Review day — a few minutes of review keeps it fresh.";
  if (plan === "lesson") return "Lesson day — pick up your next lesson.";
  return REMINDER_TEXT;
}

const DAY_MS = 86_400_000;
const NOTIFICATION_ID = 4711;
const REMINDER_HOUR = 19;

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

function capacitorGlobal(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside a Capacitor native shell (Android/iOS). */
export function isNativePlatform(): boolean {
  return Boolean(capacitorGlobal()?.isNativePlatform?.());
}

/** Rejects with a labeled error if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error(`${label} timed out after ${ms}ms — no response from the native plugin`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

async function nativePlugin() {
  // This dynamic import is the one step upstream of everything else here
  // with no timeout of its own — if the plugin's lazy-loaded chunk never
  // resolves (a stuck fetch inside the WebView, a bad chunk reference,
  // whatever), every later timeout in this file is unreachable code that
  // never runs, and the whole call just hangs silently forever.
  const { LocalNotifications } = await withTimeout(
    import("@capacitor/local-notifications"),
    5000,
    'import("@capacitor/local-notifications")',
  );
  // Capacitor plugin objects are Proxies that treat *any* accessed property —
  // including `.then` — as a call to a same-named native method. Returning
  // the plugin directly from an async function makes the JS engine's
  // Promise-resolution machinery probe it for `.then` to decide whether it's
  // a thenable, which the Proxy answers by actually invoking a native method
  // literally named "then" — one that doesn't exist, so it throws
  // "X.then() is not implemented" as an unhandled rejection. Wrapping it in
  // a plain object sidesteps the probe: a plain object has no `.then`.
  return { plugin: LocalNotifications };
}

export function notificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return isNativePlatform() || "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativePlatform()) {
    // No try/catch here on purpose: swallowing this silently is exactly what
    // made an earlier failure on-device indistinguishable from a plain
    // permission denial. Let it throw — the caller surfaces it. Each native
    // call gets its own timeout so a hang is attributed to the specific
    // plugin method that never came back, not just "something failed".
    const { plugin } = await nativePlugin();
    const current = await withTimeout(plugin.checkPermissions(), 5000, "checkPermissions()");
    if (current.display === "granted") return true;
    const res = await withTimeout(plugin.requestPermissions(), 15000, "requestPermissions()");
    return res.display === "granted";
  }

  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function parseTime(time: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!m) return [REMINDER_HOUR, 0];
  return [Math.min(23, Number(m[1])), Math.min(59, Number(m[2]))];
}

/** Next reminder time: N days after the last study day, at the chosen time. */
function nextReminderAt(everyDays: number, time: string): Date {
  const last = getLastActivityDate();
  // `getLastActivityDate()` returns a bare "YYYY-MM-DD" string. Handing that
  // straight to `new Date()` parses it as UTC midnight rather than local
  // midnight, which silently shifts the base day backward by one in every
  // negative-UTC-offset timezone once `setHours` below re-anchors it to local
  // time — so parse the components explicitly instead.
  const base = last ? parseLocalDate(last) : new Date();
  const at = new Date(base.getTime() + everyDays * DAY_MS);
  const [h, min] = parseTime(time);
  at.setHours(h, min, 0, 0);
  const now = Date.now();
  while (at.getTime() <= now) at.setTime(at.getTime() + DAY_MS);
  return at;
}

function parseLocalDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Schedules (or cancels) the native local notification. Called whenever the
 * settings change or the user studies, so the reminder always slides forward
 * past days where a lesson or practice session happened.
 */
export async function syncNativeReminder(
  enabled: boolean,
  everyDays: number,
  time: string,
  pattern: "alternate" | "both" = "both",
): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { plugin } = await nativePlugin();
    const pending = await plugin.getPending();
    const mine = pending.notifications.filter((n) => n.id === NOTIFICATION_ID);
    if (mine.length) await plugin.cancel({ notifications: mine });
    if (!enabled) return;

    const perm = await plugin.checkPermissions();
    if (perm.display !== "granted") return;

    const at = nextReminderAt(everyDays, time);
    await plugin.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: REMINDER_TITLE,
          body: reminderText(pattern, at),
          schedule: {
            at,
            allowWhileIdle: true,
          },
        },
      ],
    });
  } catch {
    /* plugin unavailable — nothing to schedule */
  }
}

function shouldNotify(everyDays: number): boolean {
  if (didStudyToday()) return false;
  const last = window.localStorage.getItem(LAST_NOTIFIED_KEY);
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  return elapsed >= everyDays * DAY_MS;
}

async function fireWeb(pattern: "alternate" | "both") {
  const opts = { body: reminderText(pattern), tag: "zerokara-reminder" };
  try {
    // Android Chrome throws "Illegal constructor" for `new Notification()`;
    // it only allows notifications through a service worker registration.
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) {
      await reg.showNotification(REMINDER_TITLE, opts);
    } else {
      new Notification(REMINDER_TITLE, opts);
    }
    window.localStorage.setItem(LAST_NOTIFIED_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

/**
 * Study reminder. On a native build this schedules a real local notification
 * that fires even when the app is closed; in a plain browser it falls back to
 * an in-app Web Notification while the tab is open. Days where a lesson or
 * practice session already happened are skipped.
 */
export function useStudyReminder() {
  const { notifications, notifyEveryDays, notifyTime, hydrated, study } = useTheme();
  const pattern = study.pattern;

  useEffect(() => {
    if (!hydrated) return;

    if (isNativePlatform()) {
      void syncNativeReminder(notifications, notifyEveryDays, notifyTime, pattern);
      // reschedule whenever progress is recorded so studying pushes it back
      const unsubscribe = subscribe(() => {
        void syncNativeReminder(notifications, notifyEveryDays, notifyTime, pattern);
      });
      // If OS notification permission was denied when the toggle was first
      // flipped on, `notifications` stays true but nothing gets scheduled.
      // Re-sync whenever the app comes back to the foreground so granting the
      // permission from Android's own Settings (rather than the in-app
      // toggle) takes effect without the user having to retoggle it here.
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          void syncNativeReminder(notifications, notifyEveryDays, notifyTime, pattern);
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        unsubscribe();
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    if (!notifications || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const check = () => {
      const [h, m] = parseTime(notifyTime);
      const now = new Date();
      const past = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
      if (past && shouldNotify(notifyEveryDays)) void fireWeb(pattern);
    };
    check();
    const id = window.setInterval(check, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [hydrated, notifications, notifyEveryDays, notifyTime, pattern]);
}
