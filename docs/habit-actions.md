# Home screen completion

Android supports two widgets under **Settings → Home screen widgets**:

The section appears near the top of Settings, before Appearance. Browser previews show the section with an Android availability note; adding widgets requires the Android APK with the native HabitActions plugin.

Under **Quick access**, the compact Home screen widgets card has a device-local on/off switch and expandable setup controls. The switch defaults to on for existing installs and is independent of Habit reminders. Turning it off sends `widgetsEnabled: false` to the native mirror, clears displayed habit rows, hides Edit/Undo, and shows a paused message. Native widget completion and Undo actions are rejected while paused, including stale controls; notification actions remain enabled separately. Installed launcher cards remain until the user removes them. Habit selections and completion history survive disabling and reenabling widgets. The preference persists under `grain_widgets_enabled`, including when signed out.

- **One habit:** the next pending habit by default, or one habit selected with Edit.
- **Today checklist:** a scrollable list of pending habits scheduled today, with optional habit selection through Edit.

Both use the app's light, dark or AMOLED theme. Binary habits offer a check button; numeric habits offer **+1**, regardless of their configured in-app step. Numeric habits complete only at their target. **Undo last action** restores the previous entry if it has not subsequently been edited. Rest days, skips and frozen days are excluded from pending actions.

Enable **Habit reminders** to receive individual actionable reminders. A habit's reminder time overrides the default time. Notifications offer **Done** or **+1**, **Later · 15 min**, and **Undo** after an action. Daily summary is optional and off by default. Morning kickoff remains optional. The test notification uses a real pending habit so its actions can be checked.

## Data flow

`HabitActionStore` holds a private native mirror and a durable outbox. BroadcastReceiver actions save progress without opening a WebView. The React bridge replays operations into the existing local store on resume and native change events, then acknowledges them. Receipts are saved atomically with completion data to prevent duplicated increments after interrupted synchronization. Native snapshot updates retain any unacknowledged actions that arrived during synchronization.

Actions carry an account and local calendar date. Stale controls cannot apply to a different account or day. Queued actions retain their original date when imported later. Widgets always use today, independently of the date being viewed inside the app. Sign-out clears displayed native data while preserving pending operations for their original account.

The scheduler checks habit frequency and completion state at delivery, renews alarms after reboot, updates widgets around local midnight, and reschedules after time or timezone changes. Android 12+ uses modern RemoteCollectionItems; Android 7–11 uses a RemoteViewsService adapter. Java time APIs are desugared for Android 7/8 compatibility.

## Validation on a phone

1. Build with `npm run build:android`, then install `releases/android/grain.apk` as an update.
2. Add both widgets. Select a habit, resize the checklist, and switch app themes.
   Turn widgets off in Settings and check that both show a paused message with no habit actions. Reenable them and verify that the same selections return. Verify notifications still work while widgets are off.
3. Swipe Grain out of Recents. Complete a binary habit and increment a numeric habit from each widget; verify Undo and reopen Grain to confirm progress.
4. Use Send Test Notification, close Grain, then test Done/+1, Undo and Later.
5. Check a weekday/custom habit on an unscheduled day, midnight rollover, reboot, and sign-out/account switching.

Reminders use Android's inexact idle-capable alarms, so Android or OxygenOS battery policies can delay their arrival. Force-stopping an app in system settings blocks its alarms until it is opened again. Closing it from Recents is supported.
