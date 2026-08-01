import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// ──────────────────────────────────────────────────────────
//  IMPORTANT: Replace these values with your Firebase project
//  credentials from the Firebase Console → Project settings →
//  General → Your apps → Web app → Firebase SDK config.
// ──────────────────────────────────────────────────────────
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlqvg-5V6ODNU-qLTcHXfunDhq14GQkPE",
  authDomain: "grain-f210a.firebaseapp.com",
  projectId: "grain-f210a",
  storageBucket: "grain-f210a.firebasestorage.app",
  messagingSenderId: "1000875759360",
  appId: "1:1000875759360:web:d91c41b466f57b30eec5e5",
  measurementId: "G-GH20F4DQKH"
};

// Singleton instances
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

/**
 * Lazily initialise Firebase and return the three core services.
 * Offline persistence is enabled so the app works without network.
 */
export function getFirebaseServices() {
  if (!_app) {
    _app = initializeApp(firebaseConfig);
    // Enable Firestore offline persistence (IndexedDB cache) with multi-tab support.
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    _auth = getAuth(_app);
  }

  return { app: _app, db: _db!, auth: _auth! };
}

// Convenience re-exports for direct destructuring
export const app = () => getFirebaseServices().app;
export const db = () => getFirebaseServices().db;
export const auth = () => getFirebaseServices().auth;
