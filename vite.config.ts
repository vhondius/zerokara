// Static build for Capacitor: `npm run build:static` emits a plain `dist/`
// (index.html + hashed assets, Capacitor's `webDir`), no server process.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 8080 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // SPA mode: every route is served from a single prerendered index.html
      // shell and hydrated in the browser.
      spa: { enabled: true },
      prerender: { enabled: true, crawlLinks: false },
    }),
    viteReact(),
  ],
});
