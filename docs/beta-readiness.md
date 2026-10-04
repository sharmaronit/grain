# Grain beta readiness

Recommendation: run a small closed beta after a real-device smoke test. Freeze new features during that test and collect failures and usability feedback from 5–10 people over a few days.

The app currently declares version 1.18 (code 20). The canonical APK at `releases/android/grain.apk` includes the latest pill, compact settings, widget controls, onboarding, and sheet motion changes. It has been rebuilt and signature-checked; real-device validation is still required.

## Before sending a beta

- Verify an upgrade preserves habits, goals, completion history, and settings. Check a backup export/import round trip and offline use.
- Test pill placement and motion on the OnePlus Nord 4 and at least one different camera layout. Check theme switching, reduced motion, sheet dragging, keyboard opening, and Android Back.
- Test both widgets, their on/off switch, completion, numeric +1, and Undo with Grain closed. Check notifications independently, then reboot and midnight rollover.
- Check sign-out/account switching cannot show or complete another account's habits.
- Prepare a release signing key and test the signed build, including Google sign-in. The current build script assembles a debug-signed APK. An update must use a compatible signing identity; changing it can require reinstalling, so preserve tester data with backup first. See [Android app signing](https://developer.android.com/studio/publish/app-signing).
- Use a beta tag such as `v1.18-beta.1`, include known issues, and provide one feedback channel. Do not mark the beta as a stable latest release.

## Website download

The current site follows `/releases/latest/download/grain.apk`. GitHub's latest release excludes prereleases, so a beta should use its specific tagged download link in the beta invitation. Keep the stable site download separate until the beta is ready to promote. See [GitHub latest release](https://docs.github.com/en/rest/releases/releases#get-the-latest-release) and [release download links](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).
