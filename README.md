# Grain

> Copyright © 2026 Ronit Sharma. All rights reserved. This is a proprietary project; see [LICENSE](LICENSE) before viewing, using, or distributing the code.

A minimalist, high-performance habit tracker and consistency dashboard. Built as a fully independent, offline-first application with Firebase syncing and native Capacitor integration.

**Website & Landing Page:** [https://trygrain.vercel.app/](https://trygrain.vercel.app/)

## Ownership and usage

Grain, its source code, UI designs, assets, logo, and compiled applications are owned by Ronit Sharma. The repository is published for controlled review and development access only. Copying, redistribution, commercial use, or creating derivative products requires written permission.

Do not commit credentials, signing keys, release tokens, or private user data. Keep the GitHub repository private if the source should not be visible, and enable branch protection and required pull requests for `main` in GitHub repository settings.

## 🚀 Tech Stack
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS
- **State & Data:** Zustand, TanStack Query, Firebase Firestore (Offline-first)
- **Native Wrapper:** Capacitor (Android/iOS)
- **UI Architecture:** Radix UI primitives, custom animated liquid glass themes

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/[Your-Username]/Grain.git
   cd Grain
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and add your Firebase credentials:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

5. **Build for Android:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```
