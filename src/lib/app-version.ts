import { App } from "@capacitor/app";

/**
 * Live native versionName (e.g. "1.0.17"), sourced straight from Android's
 * auto-incrementing build counter (android/app/build.gradle). "dev" outside
 * the native shell (browser / dev server), where there's no real build to read.
 */
export async function getAppVersion(): Promise<string> {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      const info = await App.getInfo();
      return info.version;
    } catch {
      /* plugin unavailable */
    }
  }
  return "dev";
}
