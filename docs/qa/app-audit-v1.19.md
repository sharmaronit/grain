# Grain v1.19 app audit

Date: 4 October 2026. Artifact: `releases/android/grain.apk`, version 1.19,
Android version code 21. Built after the browser audit and automated checks;
installed as an update on the connected OnePlus Nord 4 running Android 16.
The signing certificate matches the previous APK and the installed v1.13 app.

## Fixes included

- Numeric Up Next adds the configured step. Checkboxes complete a numeric
  target explicitly; Undo resets it. Rapid actions read current stored progress.
- Habit cards keep the correct date callback after date navigation. Details
  retain their habit identity when pinned or moved. Saving a note does not
  complete a habit; progress controls work independently.
- Creation and editing reject invalid numeric targets and empty custom schedules.
  Deck filters numeric habits correctly and excludes unscheduled habits.
- Consistency filters do not alter global Today totals. Best streak is historical;
  future dates and days before habit creation do not break the heatmap summary.
- Invalid backups are rejected before changing local data. Damaged storage shows
  recovery controls and can be restored from a valid backup.
- Android backup export uses the system document picker. Cancellation is not
  counted as a successful backup. Native sharing opens the Android chooser.
- Android reminders use one native scheduler instead of duplicate native and
  Capacitor schedules. Exact alarms are used when the permission is available;
  otherwise reminders use Android's inexact alarm API.
- Backup banners reserve layout space, the pill receives updated streak data,
  and calendar Back handling closes the calendar before its parent sheet.
- Offline feedback fails promptly with a retryable message. Controls gained
  accessible labels for completion, calendar navigation, Deck, and goal choices.

## Checks performed

Automated checks: 72 Vitest tests across 14 files, 61 browser scenarios, 20 device
scenarios including restoration checks, TypeScript checking, production
web build and glass CSS verification, native Java compilation and unit tests.

The browser audit covers Today and historical dates; habit creation, editing,
notes, pinning, moving, deletion, bulk deletion and Undo; numeric progress;
Deck skip/completion; goals and date validation; all consistency categories;
multi-select onboarding across all starter packs; profile and three themes;
date styles; pill preferences and all manual placement sliders; settings cards;
wallpaper themes, layouts, colors, habit sets, grids, photos and cropping;
drag dismissal and tab motion; backup export/import, reset and corrupt-storage
recovery; feedback validation/failure/retry; and authentication form handling.

Authentication and feedback service responses in the browser suite were mocked.
No test feedback was sent to a real recipient. Dormant components and clipped
legacy controls are not counted as verified live features.

On the OnePlus Nord 4, isolated test data exercised:

- Pinning both home-screen widgets, numeric +1 and binary completion, Undo,
  checklist selection of multiple habits, pause/resume, and light theme sync.
- Widget completion after killing the app process, durable queue storage, and
  replay exactly once after reopening the app.
- Notification delivery, numeric +1, binary Done, Undo, and creation of a
  snoozed reminder alarm. A timed reminder delivered once while the app was
  backgrounded, without pressing the test button.
- System document picker backup export and import, and native share chooser.
- Static wallpaper application to the lock screen.
- Camera cutout geometry, pill on/off, and the navbar's computed backdrop blur
  (`blur(20px) saturate(1.35)`) in the Android WebView.

After testing, account-owned local data matched the pre-test backup exactly,
the original signed-in account remained available, and the production APK's
Today/Consistency/Goals/settings navigation passed. Temporary widgets, test
storage, the exported test backup, and the private QA web bundle were removed.
The approved Grain lock-screen wallpaper remains on the device and was reapplied
using restored personal progress after the test data was removed. App data did
not change during that final wallpaper application.

The final APK checksum is recorded in `docs/releases.md`.

## Limits and follow-up

- Live Google sign-in remains pending at the user's request. Form and error
  handling were tested; that does not prove the live Google integration.
- A real feedback delivery to the backend was not submitted.
- Overnight midnight rollover, reboot delivery, extended battery restrictions,
  and other manufacturers/camera layouts still need a beta soak test.
- The live-wallpaper system picker and long-running wallpaper service were not
  validated by applying a live wallpaper. Static lock-screen application passed.
- The APK uses the existing compatible debug signing identity. This preserves
  updates for the current installation; it is not a production signing migration.

Recommend a small closed beta after the pending sign-in check. Freeze additional
features while collecting real-device failures. For a simpler first release,
keep Coach and advanced wallpaper controls secondary, and hide the PRO badge
until a paid plan exists. No features were removed during this audit.
