// Flattens the TanStack Start SPA build into a plain static `dist/` folder
// suitable for Capacitor's `webDir`.
//
//   dist/client/**  ->  dist/**
//   dist/server/**  ->  deleted (prerender-only, not needed at runtime)
//   dist/index.html ->  guaranteed to exist (SPA shell fallback)
import { cp, rm, readdir, access, copyFile } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const client = join(dist, "client");
const server = join(dist, "server");

const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );

if (!(await exists(client))) {
  console.error("[static] dist/client not found — run the static build first.");
  process.exit(1);
}

// Clear whatever a previous run flattened up into dist/ before flattening
// this run's output. Vite empties dist/client and dist/server on every
// build, but dist/ itself (the flattened target below) was never cleared —
// so a stale index.html from an old build could survive indefinitely,
// pointing at an old hashed JS bundle, while every subsequent build just
// added new orphaned bundles alongside it instead of replacing it.
for (const entry of await readdir(dist)) {
  if (entry === "client" || entry === "server") continue;
  await rm(join(dist, entry), { recursive: true, force: true });
}

// Move every client artifact up one level.
for (const entry of await readdir(client)) {
  await cp(join(client, entry), join(dist, entry), { recursive: true });
}
await rm(client, { recursive: true, force: true });
await rm(server, { recursive: true, force: true });

// Capacitor boots at index.html; fall back to the SPA shell when the "/"
// route wasn't emitted as a root index.html.
if (!(await exists(join(dist, "index.html")))) {
  const shell = join(dist, "_shell.html");
  if (!(await exists(shell))) {
    console.error("[static] no index.html and no _shell.html in dist/");
    process.exit(1);
  }
  await copyFile(shell, join(dist, "index.html"));
}

console.log("[static] dist/ ready — plain static site, no server required.");
