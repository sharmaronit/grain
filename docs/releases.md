# Android releases

Keep one current APK at `releases/android/grain.apk`. Root-level APKs, APKs in
website public assets, and versioned APK copies are not part of the repository.

The current artifact is **v1.24**, Android version code **26**.

This build includes the [app audit fixes and validation](qa/app-audit-v1.19.md), fading in-app notices, a Create habit shortcut on both home-screen widgets, removal of the Widget wallpaper layout, and a rolling 7-day wallpaper view replacing Weeks.

v1.22 adds a custom accent editor with a shade pad, hue slider, hex entry, and progress-color preview, and places fading notices below the top controls.

v1.23 replaces the Deck celebration and mismatched empty states with quiet, theme-aware glass cards. Deck completion copy distinguishes check-ins from pending numeric habits.

v1.24 marks today in the year wallpaper with a thin outline without a glow, so the marker does not imply completed progress.

SHA-256: `7fdba2554eb3e31706fe5b5b77b51049122a6538d3020d57c452028c76723b16`.

On Windows, run from the repository root:

```powershell
npm run build:android
```

This builds and verifies the web assets, synchronizes Capacitor, assembles the
debug APK, and replaces the canonical file only after the Android build succeeds.
The intermediate `android/app/build/outputs/apk/debug/app-debug.apk` is removed
after its checksum matches the canonical copy.

For a GitHub release:

1. Choose the tag and the branch or commit containing the release changes.
2. Upload `releases/android/grain.apk` with the exact asset name `grain.apk`.
3. Publish the release and mark it as latest.

The website automatically follows:

```text
https://github.com/sharmaronit/grain/releases/latest/download/grain.apk
```

Version numbers belong in the release title and tag. The current build is a
debug-signed APK; use the same signing key when preparing an update.
