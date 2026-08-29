# Grain

A minimalist, high-performance habit tracker and consistency dashboard. Built as a fully independent, offline-first application with Firebase syncing and native Capacitor integration.

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
