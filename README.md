# Zerokara

A Japanese-learning app built around the *Japanese From Zero* book series (books 1–5), packaged as an Android app (Capacitor) with a React/TanStack Start web front end. All progress is stored locally on-device — no account or server required.

**Current version:** 1.0.0
**Download:** [Zerokara_v1.0.0.apk](https://github.com/vhondius/zerokara/releases/latest/download/Zerokara_v1.0.0.apk) — grab it straight from the [Releases page](https://github.com/vhondius/zerokara/releases/latest) and sideload it on Android.

## Features

- **Structured course** — lessons and units following *Japanese From Zero* books 1–5, with an overview view and "resume where you left off" on the Learn tab.
- **Practice** — flashcards, quizzes, and stroke tracing for hiragana, katakana, kanji, and vocabulary.
- **Spaced repetition (SRS)** — practiced items are scheduled for review and resurface when they're due, rather than on a fixed drill order.
- **Progress tracking** — course completion, a kana mastery grid, and the review queue at a glance, all stored locally in the browser/app.
- **Quick reference** — everyday Japanese phrases grouped by situation (greetings, self-introductions, shopping, dining, and more).
- **Review reminders** — local notifications nudge you back in when items are due.
- **Backup** — export everything to a file in Settings and import it again, on this or another device.

## Development

Requires Node.js/npm.

```sh
git clone https://github.com/vhondius/zerokara.git
cd zerokara
npm i
npm run dev
```

## Building the Android APK

Requires the Android SDK and JDK 21.

```sh
rm -rf dist
npm run build:static
npx cap sync android
cd android
./gradlew assembleDebug
```

The signed APK is written to `android/app/build/outputs/apk/debug/`. The app is signed with a project-local keystore (`android/app/zerokara.keystore`) so builds from any machine install in place over previous versions. `android/app/version.properties` holds a self-incrementing build counter driving the version name and output filename.
