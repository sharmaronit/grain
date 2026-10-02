# Grain

Grain is a focused habit tracker built around the Eisenhower Matrix. It helps people choose the work that matters, build repeatable routines, and see consistency without turning the experience into a noisy dashboard.

**Product:** [trygrain.vercel.app](https://trygrain.vercel.app/)<br>
**Repository:** [github.com/sharmaronit/grain](https://github.com/sharmaronit/grain)

## Product principles

- Start with one small action and make progress visible.
- Keep daily interactions fast and distraction-free.
- Work locally first so recording a habit does not depend on network latency.
- Reveal advanced views only after the core habit loop is established.
- Treat personal habit data as user-owned and portable through backups.

## Current capabilities

- Eisenhower Matrix habit organization
- Daily check-ins, streaks, completion rates, and consistency heatmaps
- Goals, My Day, Deck, weekly reviews, and progress insights
- Custom lock-screen wallpaper generation with photo cropping and repositioning
- Dark, light, and AMOLED themes with liquid-glass controls
- Local-first habit and completion storage
- JSON backup export and import for device migration
- Firebase authentication with one-time migration of existing cloud data
- Capacitor Android integration for wallpaper and notification features

## Technology

- React 19 and TypeScript
- Vite and Tailwind CSS
- Zustand for client state
- Firebase Authentication and Firestore migration support
- Capacitor for native Android integration
- Vitest for automated tests

## Requirements

- Node.js 20 or newer
- npm
- Android Studio and an Android SDK for native builds
- A configured Firebase project for authentication

## Local development

```bash
git clone https://github.com/sharmaronit/grain.git
cd grain
npm install
```

Create a local environment file from the example and add the Firebase values:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

Run the production checks:

```bash
npm test
npm run build
```

## Android build

Build the web application, synchronize Capacitor assets, and assemble the debug APK:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug` instead of `./gradlew assembleDebug`.

The generated debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For a public GitHub release, rename the uploaded asset to `grain.apk`. The website download button points to the latest release asset with that exact filename.

## Data and privacy

Habit data is stored locally on the device so daily actions remain fast and available offline. The account is retained for authentication. Use Settings → Export data before uninstalling the app or moving to another device, then use Import backup to restore it.

Do not commit `.env` files, Firebase service-account keys, Android signing keys, release tokens, or personal user data.

## Release workflow

The `main` branch is the production branch. Create a feature branch, run tests and a production build, open a pull request, and merge only after review:

```bash
git checkout -b feature/short-description
git add .
git commit -m "Describe the change"
git push -u origin feature/short-description
```

Keep the `main` branch protected in GitHub. Publish releases with a version tag and upload the APK as `grain.apk`.

## License and ownership

Copyright © 2026 Ronit Sharma. Grain's source code, product design, logo, assets, documentation, and compiled applications are proprietary. Copying, redistribution, commercial use, or derivative products require prior written permission. See [LICENSE](LICENSE) for the complete terms.
