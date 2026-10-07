import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vincenthondius.zerokara",
  appName: "Zerokara",
  // Capacitor packages the plain static build (see vite.config.ts /
  // `npm run build:static`); the native shell just
  // needs a self-contained HTML/JS/CSS bundle.
  webDir: "dist",
  plugins: {
    LocalNotifications: {
      // A monochrome vector icon dedicated to the status bar — Android
      // notification icons must be a flat alpha mask, not a launcher icon.
      // See android/app/src/main/res/drawable/ic_stat_reminder.xml.
      smallIcon: "ic_stat_reminder",
      iconColor: "#B33A3A",
    },
  },
};

export default config;
