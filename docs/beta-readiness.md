# Grain beta readiness

Recommendation: finish live Google sign-in verification, then run a small closed beta. Core checks on the OnePlus Nord 4 have passed. Freeze new features during the beta and collect failures and usability feedback from 5–10 people over a few days.

The app currently declares version 1.23 (code 25). The canonical APK at `releases/android/grain.apk` includes the audit fixes, lowered fading in-app notice, widget habit shortcut, rolling 7-day wallpaper view, custom accent editor, and theme-aware completion and empty states. Live Google sign-in and longer device testing remain pending. See the [v1.19 audit](qa/app-audit-v1.19.md) for the prior full-device checks.

## Before sending a beta

- Verify an upgrade preserves habits, goals, completion history, and settings. Check a backup export/import round trip and offline use.
- Check the fading in-app notice in each theme and with reduced motion. Check theme switching, sheet dragging, keyboard opening, and Android Back.
- Test both widgets, their on/off switch, Add habit shortcut, completion, numeric +1, and Undo with Grain closed. Check notifications independently, then reboot and midnight rollover.
- Check sign-out/account switching cannot show or complete another account's habits.
- Prepare a release signing key and test the signed build, including Google sign-in. The current build script assembles a debug-signed APK. An update must use a compatible signing identity; changing it can require reinstalling, so preserve tester data with backup first. See [Android app signing](https://developer.android.com/studio/publish/app-signing).
- Use a beta tag such as `v1.23-beta.1`, include known issues, and provide one feedback channel. Do not mark the beta as a stable latest release.

## Website download

The current site follows `/releases/latest/download/grain.apk`. GitHub's latest release excludes prereleases, so a beta should use its specific tagged download link in the beta invitation. Keep the stable site download separate until the beta is ready to promote. See [GitHub latest release](https://docs.github.com/en/rest/releases/releases#get-the-latest-release) and [release download links](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).
