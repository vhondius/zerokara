import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApkInstaller, checkForUpdate, type AvailableUpdate } from "@/lib/update-check";

/**
 * On app open (native only), offers to download and install a newer GitHub
 * release. "Later" just closes it; it asks again on the next launch.
 */
export function AppUpdateDialog() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    checkForUpdate().then(setUpdate);
  }, []);

  const close = () => setUpdate(null);

  const install = async () => {
    if (!update) return;
    setStatus("downloading");
    try {
      await ApkInstaller.install({ url: update.apkUrl });
      setStatus("idle");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!update || status === "downloading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [update, status]);

  if (!update || typeof document === "undefined") return null;
  const busy = status === "downloading";

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Update available"
      onClick={busy ? undefined : close}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-held"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-display text-lg text-foreground">
          Update available — v{update.version}
        </h2>

        {update.notes ? (
          <p className="whitespace-pre-line text-sm text-foreground">{update.notes}</p>
        ) : null}

        {busy ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Downloading… the installer opens when it's done.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-3 text-sm text-destructive">Couldn't update: {error}</p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Later
          </button>
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {status === "error" ? "Try again" : "Download & install"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
