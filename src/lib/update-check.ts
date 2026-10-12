import { registerPlugin } from "@capacitor/core";
import { getAppVersion } from "@/lib/app-version";

const LATEST_RELEASE = "https://api.github.com/repos/vhondius/zerokara/releases/latest";

export type AvailableUpdate = { version: string; apkUrl: string; notes: string };

/** Native-only (android/.../ApkInstallerPlugin.java): downloads the APK and opens the system installer. */
export const ApkInstaller = registerPlugin<{ install(opts: { url: string }): Promise<void> }>(
  "ApkInstaller",
);

/** True when dotted version `remote` is higher than `local`; a leading "v" is ignored. */
export function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const r = parse(remote);
  const l = parse(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] || 0;
    const b = l[i] || 0;
    if (a !== b) return a > b;
  }
  return false;
}

/**
 * The latest GitHub release, if it's newer than the installed build and has an
 * APK attached. Null outside the native shell and on any network/API failure.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const installed = await getAppVersion();
  if (installed === "dev") return null;
  try {
    const res = await fetch(LATEST_RELEASE, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const release = (await res.json()) as {
      tag_name: string;
      body?: string;
      assets: { name: string; browser_download_url: string }[];
    };
    const apk = release.assets.find((a) => a.name.endsWith(".apk"));
    if (!apk || !isNewer(release.tag_name, installed)) return null;
    return {
      version: release.tag_name.replace(/^v/, ""),
      apkUrl: apk.browser_download_url,
      notes: release.body ?? "",
    };
  } catch {
    return null;
  }
}
