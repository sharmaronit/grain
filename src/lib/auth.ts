import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

import { Capacitor } from "@capacitor/core";

// ── Friendly error messages ──────────────────────────────
const errorMessages: Record<string, string> = {
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Google sign-in popup was closed.",
  "auth/cancelled-popup-request": "Google sign-in request was cancelled.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/invalid-api-key":
    "Firebase API key missing/invalid. Update src/lib/firebase.ts.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Firebase API key missing/invalid. Update src/lib/firebase.ts.",
  "auth/operation-not-allowed":
    "Google Sign-In disabled in Firebase Console (Auth → Sign-in method).",
  "auth/configuration-not-found":
    "Google Sign-In is not enabled. Go to Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', and enable 'Google'.",
  "auth/unauthorized-domain":
    "Domain not authorized in Firebase Console (Auth → Settings).",
  "auth/popup-blocked":
    "Sign-in popup blocked by browser. Please allow popups.",
  "auth/operation-not-supported-in-this-environment":
    "Google popup not supported in mobile app. Please use Email/Password.",
};

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("API key") || code.includes("api-key")) {
    return "Firebase credentials not set! Replace REPLACE_ME in src/lib/firebase.ts with your Firebase config.";
  }
  return errorMessages[code] ?? (msg || "Something went wrong. Please try again.");
}

// ── Auth operations ──────────────────────────────────────

/** Sign in with email and password. */
export async function signInEmail(
  email: string,
  password: string,
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth(), email, password);
  return cred.user;
}

/** Create a new account with email, password, and display name. */
export async function signUpEmail(
  email: string,
  password: string,
  name: string,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth(), email, password);
  const user = cred.user;

  // Set the display name on the Firebase Auth profile
  await updateProfile(user, { displayName: name });

  // Create the initial Firestore user document
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  await setDoc(doc(db(), "users", user.uid), {
    name,
    email: user.email,
    tagline: "Building the 1% better version daily.",
    initials,
    theme: "dark",
    wallpaperTheme: "amoled",
    wallpaperSync: true,
    remindersOn: true,
    previewWeeks: 26,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { signInWithCredential } from "firebase/auth";

/** Sign in with Google (Native Android Google Account Sheet or Web Popup). */
export async function signInGoogle(): Promise<User> {
  let user: User | null = null;

  try {
    if (Capacitor.isNativePlatform()) {
      // Native Android Google Sign-In (native bottom sheet inside app)
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth(), credential);
        user = cred.user;
      }
    } else {
      // Web browser Google popup
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth(), provider);
      user = cred.user;
    }
  } catch (err: any) {
    console.error("[Google Auth Error]", err);
    throw err;
  }

  if (!user) {
    user = auth().currentUser;
  }

  if (user) {
    // Create user doc if this is their first sign-in
    const userRef = doc(db(), "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const name = user.displayName ?? user.email?.split("@")[0] ?? "You";
      const initials = name
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

      await setDoc(userRef, {
        name,
        email: user.email,
        tagline: "Building the 1% better version daily.",
        initials,
        theme: "dark",
        wallpaperTheme: "amoled",
        wallpaperSync: true,
        remindersOn: true,
        previewWeeks: 26,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return user;
  }

  throw new Error("Google Sign-In did not return a valid user session.");
}

/** Send a password-reset email. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email);
}

/** Sign out. */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth());
}

export { friendlyError };

// ── Auth state hook ──────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * React hook that subscribes to Firebase Auth state changes.
 * Returns the current user (or null) and a loading flag.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      setState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  return state;
}
