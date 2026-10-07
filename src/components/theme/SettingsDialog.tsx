import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TEXT_SIZES, useTheme } from "./ThemeProvider";
import { notificationsSupported, requestNotificationPermission } from "@/lib/notifications";
import { resetAll } from "@/lib/progress-store";
import { clearFaultLog, downloadFaultLog, getFaultLog, subscribeFaultLog } from "@/lib/fault-log";
import { getAppVersion } from "@/lib/app-version";
import { exportBackup, importBackup } from "@/lib/backup";
import { CHANGELOG } from "@/lib/changelog";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-muted border border-border"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${
          checked ? "left-4.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1 text-xs transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        className="no-spin w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm text-foreground"
      />
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const {
    dark,
    color,
    textSize,
    notifications,
    notifyEveryDays,
    notifyTime,
    setDark,
    setColor,
    setTextSize,
    setNotifications,
    setNotifyEveryDays,
    setNotifyTime,
    study,
    setStudy,
    reportButtons,
    setReportButtons,
  } = useTheme();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [faultCount, setFaultCount] = useState(0);
  const [confirmClearFaults, setConfirmClearFaults] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    void getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const sync = () => setFaultCount(getFaultLog().length);
    sync();
    return subscribeFaultLog(sync);
  }, []);

  const onToggleNotifications = async (v: boolean) => {
    if (!v) {
      setNotifications(false);
      setPermissionDenied(false);
      return;
    }
    // Wait for the permission result before flipping the switch: syncing the
    // native reminder is driven by `notifications` changing, so flipping it on
    // before permission is actually granted schedules against a not-yet-granted
    // permission and nothing re-triggers the sync once the grant lands.
    //
    // A visible "requesting…" toast turns two otherwise indistinguishable
    // failures into distinct, diagnosable ones: if this toast never appears,
    // the tap itself isn't reaching this handler; if it appears but nothing
    // follows, `requestNotificationPermission` (which times out and labels
    // each native call individually) resolved neither way — a hung native
    // callback, not a thrown error.
    toast("Requesting notification permission…");
    try {
      const ok = await requestNotificationPermission();
      setNotifications(ok);
      setPermissionDenied(!ok);
    } catch (err) {
      setNotifications(false);
      setPermissionDenied(true);
      toast.error(
        `Notification permission request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-held"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <Row label="Dark mode" hint="Sumi-ink palette for low light.">
          <Toggle checked={dark} onChange={setDark} label="Toggle dark mode" />
        </Row>

        <Row label="Colour mode" hint="Tint each section with its book colour.">
          <Toggle checked={color} onChange={setColor} label="Toggle colour mode" />
        </Row>

        <Row label="Text size">
          <div className="inline-flex items-center gap-1 rounded-md border border-border p-0.5">
            {TEXT_SIZES.map((s) => (
              <SegButton key={s} active={textSize === s} onClick={() => setTextSize(s)}>
                {s === "normal" ? "A" : s === "large" ? "A+" : s === "larger" ? "A++" : "A+++"}
              </SegButton>
            ))}
          </div>
        </Row>

        <Row
          label="Study reminders"
          hint={
            !notificationsSupported()
              ? "Notifications aren't supported on this device."
              : permissionDenied
                ? "Permission denied — enable notifications for Zerokara in your device's app settings, then try the toggle again."
                : "A nudge when you haven't studied."
          }
        >
          <Toggle
            checked={notifications}
            onChange={(v) => void onToggleNotifications(v)}
            label="Toggle study reminders"
          />
        </Row>

        <Row
          label="Reminder frequency"
          hint={`Every ${notifyEveryDays} day${notifyEveryDays === 1 ? "" : "s"} — skipped on days you study.`}
        >
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease reminder frequency"
              onClick={() => setNotifyEveryDays(Math.max(1, notifyEveryDays - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50"
              disabled={notifyEveryDays <= 1}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              inputMode="numeric"
              pattern="[0-9]*"
              value={notifyEveryDays}
              aria-label="Reminder frequency in days"
              onChange={(e) => setNotifyEveryDays(Number(e.target.value) || 1)}
              className="no-spin w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm text-foreground"
            />
            <button
              type="button"
              aria-label="Increase reminder frequency"
              onClick={() => setNotifyEveryDays(Math.min(30, notifyEveryDays + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50"
              disabled={notifyEveryDays >= 30}
            >
              +
            </button>
          </div>
        </Row>

        <Row label="Reminder time" hint="When the reminder is pushed, in your local time.">
          <input
            type="time"
            value={notifyTime}
            step={300}
            aria-label="Reminder time of day"
            onChange={(e) => setNotifyTime(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
          />
        </Row>

        <div className="mt-4 text-xs font-medium uppercase tracking-widest text-accent">Study</div>

        <Row
          label="Daily plan"
          hint={
            study.pattern === "alternate"
              ? "Home suggests a lesson one day and a review the next."
              : "Home suggests a lesson and a review every day."
          }
        >
          <div className="inline-flex items-center gap-1 rounded-md border border-border p-0.5">
            <SegButton
              active={study.pattern === "alternate"}
              onClick={() => setStudy({ pattern: "alternate" })}
            >
              Alternate
            </SegButton>
            <SegButton
              active={study.pattern === "both"}
              onClick={() => setStudy({ pattern: "both" })}
            >
              Both daily
            </SegButton>
          </div>
        </Row>

        <Row label="New cards per day" hint="First-time cards per deck (kana, kanji, vocabulary).">
          <Stepper
            value={study.newPerDay}
            min={0}
            max={200}
            step={5}
            label="New cards per day"
            onChange={(v) => setStudy({ newPerDay: v })}
          />
        </Row>

        <Row label="Reviews per day" hint="Most reviews of known cards per deck per day.">
          <Stepper
            value={study.reviewsPerDay}
            min={10}
            max={1000}
            step={10}
            label="Reviews per day"
            onChange={(v) => setStudy({ reviewsPerDay: v })}
          />
        </Row>

        <Row label="Cards per session" hint="One review session; start another when it's done.">
          <Stepper
            value={study.sessionSize}
            min={5}
            max={200}
            step={5}
            label="Cards per session"
            onChange={(v) => setStudy({ sessionSize: v })}
          />
        </Row>

        <Row
          label="Repeat missed cards"
          hint={'A card you mark "Again" comes back later in the same session.'}
        >
          <Toggle
            checked={study.requeueAgain}
            onChange={(v) => setStudy({ requeueAgain: v })}
            label="Toggle repeating missed cards"
          />
        </Row>

        <div className="mt-4 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">Fault log</div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {faultCount} report{faultCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Content errors you've flagged, stored on this device.
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">Report buttons</span>
            <Toggle
              checked={reportButtons}
              onChange={setReportButtons}
              label="Toggle report buttons"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Shows a small ! on each lesson item and card for flagging a mistake.
          </p>
          {confirmClearFaults ? (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">
                This permanently deletes all {faultCount} logged reports. Download them first if you
                still need them.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearFaultLog();
                    setConfirmClearFaults(false);
                  }}
                  className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground"
                >
                  Yes, clear fault log
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearFaults(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadFaultLog()}
                disabled={faultCount === 0}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
              >
                Download fault log
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearFaults(true)}
                disabled={faultCount === 0}
                className="rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-50"
              >
                Clear fault log
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-md border border-border p-3">
          <div className="text-sm font-medium text-foreground">Backup</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Save your progress, settings and fault log to a file, or restore them from one.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportBackup()}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
            >
              Export backup
            </button>
            <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-foreground">
              Import backup
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (!window.confirm("Replace everything on this device with this backup?"))
                    return;
                  try {
                    await importBackup(file);
                    window.location.reload();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't read this backup.");
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="text-sm font-medium text-foreground">Delete progress data</div>
          {deleted ? (
            <p className="mt-1 text-xs text-muted-foreground">All progress has been deleted.</p>
          ) : confirmDelete ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                This permanently erases lesson completion, exercise answers and all
                spaced-repetition scheduling on this device. This cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAll();
                    setDeleted(true);
                    setConfirmDelete(false);
                  }}
                  className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground"
                >
                  Yes, delete everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Removes all local progress from this device.
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-medium text-destructive"
              >
                Delete progress data
              </button>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Zerokara v{appVersion ?? "…"}</span>
          <button
            type="button"
            onClick={() => setShowChangelog((v) => !v)}
            className="rounded-md border border-border px-2 py-1 text-foreground hover:bg-muted"
          >
            {showChangelog ? "Hide what's new" : "See what's new"}
          </button>
        </div>
        {showChangelog ? (
          <div className="mt-2 space-y-3 rounded-md border border-border bg-muted/40 p-3">
            {CHANGELOG.map((entry) => (
              <div key={entry.id}>
                <p className="text-xs text-muted-foreground">{entry.date}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-foreground">
                  {entry.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
