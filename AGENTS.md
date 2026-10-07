## Changelog

Before building an Android APK — including when asked to "build a new apk" — review
what user-facing changes have landed since the last `src/lib/changelog.ts` entry (git
diff, recent session work) and add or extend **today's** dated entry with plain,
user-facing bullet points, matching the tone of the existing entries. Do this
proactively, don't wait to be asked; it's part of the build, not a separate task.

`android/app/build.gradle` enforces this mechanically: `assembleDebug`/`assembleRelease`
fail unless `changelog.ts`'s newest entry is dated today. If you're rebuilding same-day
for more changes, extend that day's entry with more bullets rather than adding a new
`id` — only bump `id` for a genuinely new entry (see the comment in `changelog.ts`).

**Important:** this check only reads the `.ts` source file's date via regex — it does
*not* verify the compiled web bundle (`android/app/src/main/assets/public`) actually
reflects it. If you edit any source file (changelog.ts included) after already having
run `npm run build:static` + `npx cap sync android`, re-run both before `gradlew
assembleDebug` — otherwise the check passes on the source date but the APK ships
whatever stale JS was already synced, silently missing the edit (this has happened:
a same-day rebuild re-ran only `gradlew assembleDebug` after a late changelog edit and
shipped a "What's new" popup with no new entry). Treat `build:static` → `cap sync
android` → `gradlew assembleDebug` as one atomic sequence, not three independent steps.

## Releasing

After every APK build intended for release (not just local testing), verify — don't
assume — before calling it done:
1. The built APK's filename/`versionName` (from `android/app/version.properties`,
   auto-incremented by Gradle on every invocation, including failed ones) matches
   `README.md`'s "Current version" line and download link.
2. The GitHub release actually exists at that exact tag with the APK attached —
   `gh release view vX.X.X --json assets` (state `"uploaded"`, size matches the local
   file) is reliable; plain `curl` against `github.com/.../releases/download/...` can
   404 from some sandboxed environments even for long-published assets, so don't use
   it alone to conclude a release is broken.
3. Spot-check that the content you meant to ship is actually in the built artifact,
   e.g. `unzip -p APK assets/public/assets/*.js | grep "<unique new string>"` — don't
   infer from the source commit alone that the binary reflects it.
