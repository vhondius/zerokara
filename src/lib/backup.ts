/**
 * Backup of everything the app keeps on this device (progress, settings,
 * drafts, fault log): every localStorage key under the app prefix, as one
 * JSON file the user can save and import again, on this or another install.
 */
const PREFIX = "zerokara.";
const FORMAT = 1;

type Backup = { format: number; data: Record<string, string> };

/** Saves a JSON file: native share sheet in the app, a download in the browser. */
export async function saveJsonFile(filename: string, data: string, dialogTitle: string) {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    // `<a download>` against a blob: URL is a browser-only trick — Android's
    // WebView has no download handling for blob: URLs, so it's a silent
    // no-op there. Write the file to app cache and hand it to the native
    // share sheet instead, which is the one thing that reliably gets a file
    // out of a sandboxed WebView on Android (Save to Files, email, etc.).
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    try {
      await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: filename, url: uri, dialogTitle });
    } catch {
      /* user cancelled the share sheet, or the plugin is unavailable */
    }
    return;
  }

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function appKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

export async function exportBackup(): Promise<void> {
  if (typeof window === "undefined") return;
  const data: Record<string, string> = {};
  for (const k of appKeys()) data[k] = window.localStorage.getItem(k) ?? "";
  const backup: Backup = { format: FORMAT, data };
  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
  await saveJsonFile(filename, JSON.stringify(backup), "Save backup");
}

/** Validates a parsed backup file and returns the keys to restore. Throws on a bad file. */
export function backupEntries(parsed: unknown): [string, string][] {
  const b = parsed as Partial<Backup> | null;
  if (!b || b.format !== FORMAT || typeof b.data !== "object" || b.data === null) {
    throw new Error("This file isn't a backup from this app.");
  }
  const entries = Object.entries(b.data).filter(
    (e): e is [string, string] => e[0].startsWith(PREFIX) && typeof e[1] === "string",
  );
  if (entries.length === 0) throw new Error("This backup is empty.");
  return entries;
}

/** Replaces everything stored on this device with the backup's contents. */
export async function importBackup(file: File): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This file isn't a backup from this app.");
  }
  const entries = backupEntries(parsed);
  for (const k of appKeys()) window.localStorage.removeItem(k);
  for (const [k, v] of entries) window.localStorage.setItem(k, v);
}
