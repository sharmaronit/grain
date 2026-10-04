# Android releases

Keep one current APK at `releases/android/grain.apk`. Root-level APKs, APKs in
website public assets, and versioned APK copies are not part of the repository.

The current artifact is **v1.18**, Android version code **20**.

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
