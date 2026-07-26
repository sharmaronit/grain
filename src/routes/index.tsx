import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  Flame,
  Settings,
  Plus,
  Pin,
  MoreVertical,
  Check,
  Wifi,
  ChevronDown,
  Sparkles,
  Zap,
  Clock,
  Trash2,
  Wallpaper,
  X,
  Sun,
  Moon,
  RotateCcw,
  Loader2,
  ArrowRight,
  Sunrise,
  Bell,
  Download,
  Share2,
  Droplets,
  Minus,
  Shield,
  Snowflake,
  CalendarDays,
  LayoutGrid,
  Plane,
  Flashlight,
  Camera,
  LogOut,
  AlertCircle,
  WifiOff,
  User,
} from "lucide-react";

// ── Firebase auth & data hooks ───────────────────────────
import {
  useAuth,
  signInEmail,
  signUpEmail,
  signInGoogle,
  signOut,
  resetPassword,
  friendlyError,
} from "../lib/auth";
import { scheduleDailyReminder } from "../lib/reminders";
import { useHabits } from "../hooks/useHabits";
import { useCompletions } from "../hooks/useCompletions";
import { useHeatmap } from "../hooks/useHeatmap";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  updateUserProfile,
  getUserProfile,
  type HabitDoc,
  type Quadrant,
  type UserProfile,
} from "../lib/firestore";
import {
  formatDateKey,
  getWeekDates,
  isSameDay,
  shortDay,
  todayKey,
} from "../lib/dates";
import {
  calculateStreak,
  calculateBestStreak,
  type CompletionsMap,
} from "../lib/streaks";

const catClass = (_c: string) =>
  "bg-canvas-soft text-body border border-[color:var(--hairline)]";


const TIME_TABS = [
  { key: "all", label: "All", icon: null },
  { key: "morning", label: "Morning", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", icon: Sun },
  { key: "evening", label: "Evening", icon: Moon },
] as const;

const WALLPAPER_THEMES = [
  { key: "amoled", label: "AMOLED Black", swatch: "#000000", bg: "#000000", fg: "#ffffff" },
  { key: "slate", label: "Slate Dark", swatch: "#1f2937", bg: "#1f2937", fg: "#e5e7eb" },
  { key: "neon", label: "Neon Cyberpunk", swatch: "linear-gradient(135deg,#ec4899,#06b6d4)", bg: "linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#06b6d4 100%)", fg: "#ffffff" },
  { key: "mono", label: "Minimal Mono", swatch: "#e9e9ea", bg: "#e9e9ea", fg: "#111111" },
] as const;

const wallpaperThemeOf = (key: string) =>
  WALLPAPER_THEMES.find((t) => t.key === key) ?? WALLPAPER_THEMES[0];

// Per-theme palette used consistently across preview widget, fullscreen
// lockscreen, main heatmap, and quadrant accents.
type WpTokens = {
  bg: string; fg: string; fgSoft: string;
  empty: string; low: string; mid: string; hi: string;
  accent: string; accentSoft: string;
};
const wallpaperTokens = (key: string): WpTokens => {
  switch (key) {
    case "mono":
      return {
        bg: "#e9e9ea", fg: "#111111", fgSoft: "rgba(17,17,17,0.75)",
        empty: "#d4d4d8", low: "#a1a1aa", mid: "#059669", hi: "#16a34a",
        accent: "#059669", accentSoft: "#047857",
      };
    case "slate":
      return {
        bg: "#1f2937", fg: "#e5e7eb", fgSoft: "rgba(229,231,235,0.75)",
        empty: "#334155", low: "#475569", mid: "#38bdf8", hi: "#7dd3fc",
        accent: "#38bdf8", accentSoft: "#0ea5e9",
      };
    case "neon":
      return {
        bg: "linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#06b6d4 100%)",
        fg: "#ffffff", fgSoft: "rgba(255,255,255,0.8)",
        empty: "rgba(255,255,255,0.14)", low: "rgba(255,255,255,0.35)",
        mid: "#f472b6", hi: "#22d3ee",
        accent: "#f472b6", accentSoft: "#22d3ee",
      };
    case "amoled":
    default:
      return {
        bg: "#000000", fg: "#ffffff", fgSoft: "rgba(255,255,255,0.8)",
        empty: "#2a2a2a", low: "#3f3f46", mid: "#166534", hi: "#22c55e",
        accent: "#22c55e", accentSoft: "#4ade80",
      };
  }
};


export const Route = createFileRoute("/")({
  component: AuthGate,
});

type AuthStage = "login" | "onboarding" | "app";

const authStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string, remember: boolean) {
    try {
      const primary = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      primary.setItem(key, value);
      other.removeItem(key);
    } catch {}
  },
  clear(key: string) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {}
  },
};

export function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PhoneShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink" />
        </div>
      </PhoneShell>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Grain user={user} />;
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex justify-center bg-canvas overflow-hidden">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-canvas pt-safe pb-safe">
        {children}
      </div>
    </div>
  );
}

type LoadingKind = null | "email" | "google" | "signup" | "reset";
type AuthMode = "signin" | "signup" | "forgot";

function LiquidLoadingOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center animate-fade-in"
      style={{
        background: "color-mix(in oklab, var(--canvas) 55%, transparent)",
        backdropFilter: "blur(18px) saturate(140%)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lg-blob absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full" />
        <div className="lg-blob absolute right-4 bottom-16 h-40 w-40 rounded-full" style={{ animationDelay: "-4s" }} />
      </div>
      <div className="liquid-glass specular relative flex flex-col items-center gap-3 rounded-3xl px-7 py-6">
        <div className="relative grid h-12 w-12 place-items-center">
          <div className="absolute inset-0 rounded-full border border-[color:var(--hairline)]" />
          <Loader2 className="h-6 w-6 animate-spin text-ink" />
        </div>
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState<LoadingKind>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);

  const busy = loading !== null;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const switchMode = (m: AuthMode) => {
    if (busy) return;
    setMode(m);
    setFormError(null);
    setGoogleError(null);
    setResetSent(null);
  };

  const loadingLabel =
    loading === "email" ? "Signing you in…" :
    loading === "signup" ? "Creating your account…" :
    loading === "reset" ? "Sending reset link…" :
    loading === "google" ? "Connecting to Google…" : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setGoogleError(null);

    if (!emailValid) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (mode === "forgot") {
      try { navigator.vibrate?.(14); } catch {}
      setLoading("reset");
      try {
        await resetPassword(email.trim());
        setResetSent(email.trim());
      } catch (err) {
        setFormError(friendlyError(err));
      } finally {
        setLoading(null);
      }
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setFormError("Please enter your name.");
        return;
      }
      if (confirm !== password) {
        setFormError("Passwords do not match.");
        return;
      }
      try { navigator.vibrate?.(14); } catch {}
      setLoading("signup");
      try {
        await signUpEmail(email.trim(), password, name.trim());
      } catch (err) {
        setFormError(friendlyError(err));
        try { navigator.vibrate?.([20, 40, 20]); } catch {}
      } finally {
        setLoading(null);
      }
      return;
    }

    try { navigator.vibrate?.(14); } catch {}
    setLoading("email");
    try {
      await signInEmail(email.trim(), password);
    } catch (err) {
      setFormError(friendlyError(err));
      try { navigator.vibrate?.([20, 40, 20]); } catch {}
    } finally {
      setLoading(null);
    }
  };

  const submitGoogle = async () => {
    if (busy) return;
    setFormError(null);
    setGoogleError(null);
    setLoading("google");
    try {
      await signInGoogle();
    } catch (err) {
      setGoogleError(friendlyError(err));
      try { navigator.vibrate?.([20, 40, 20]); } catch {}
    } finally {
      setLoading(null);
    }
  };

  const inputCls = (invalid: boolean) =>
    `w-full rounded-2xl border bg-canvas-soft px-4 py-3 text-[14px] text-ink placeholder:text-body focus:outline-none focus:ring-2 disabled:opacity-60 ${
      invalid ? "border-red-500/60 focus:ring-red-500/30" : "border-[color:var(--hairline)] focus:ring-ink/30"
    }`;

  const title =
    mode === "signup" ? (<>Create your<br />account.</>) :
    mode === "forgot" ? (<>Reset your<br />password.</>) :
    (<>Build habits<br />that stick.</>);

  const subtitle =
    mode === "signup" ? "Start your streak today. It only takes a few seconds." :
    mode === "forgot" ? "We’ll email you a link to set a new password." :
    "Track streaks, prioritize with the matrix, and turn your lock screen into a heatmap.";

  return (
    <PhoneShell>
      {/* ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lg-blob absolute -left-16 top-24 h-56 w-56 rounded-full" />
        <div className="lg-blob absolute -right-16 bottom-24 h-64 w-64 rounded-full" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="relative flex h-full flex-col overflow-y-auto px-6 sm:px-7 pb-6 sm:pb-8 pt-8 sm:pt-14">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-2xl bg-ink text-on-ink">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base sm:text-lg font-bold text-ink">Grain</span>
        </div>

        <div className="mt-5 sm:mt-8">
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold leading-[1.05] tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 sm:mt-3 max-w-[280px] text-[12px] sm:text-[13px] text-body leading-relaxed">{subtitle}</p>
        </div>

        {mode !== "forgot" && (
          <>
            <button
              onClick={submitGoogle}
              type="button"
              data-lg-press
              disabled={busy}
              className="pill mt-5 sm:mt-6 flex w-full items-center justify-center gap-2 border border-[color:var(--hairline)] bg-canvas-soft py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-semibold text-ink transition disabled:opacity-70"
            >
              <GoogleGlyph /> Continue with Google
            </button>

            {googleError && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-500 animate-fade-in">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            <div className="mt-5 sm:mt-6 flex items-center gap-3 text-[11px] text-body">
              <div className="h-px flex-1 bg-[color:var(--hairline)]" />
              <span>or sign in with email</span>
              <div className="h-px flex-1 bg-[color:var(--hairline)]" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3" noValidate>
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              disabled={busy}
              onChange={(e) => { setName(e.target.value); if (formError) setFormError(null); }}
              placeholder="Full name"
              className={inputCls(false)}
            />
          )}
          <input
            type="email"
            required
            value={email}
            disabled={busy}
            aria-invalid={!!formError}
            onChange={(e) => { setEmail(e.target.value); if (formError) setFormError(null); if (resetSent) setResetSent(null); }}
            placeholder="Email"
            className={inputCls(!!formError)}
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              disabled={busy}
              aria-invalid={!!formError}
              onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(null); }}
              placeholder="Password"
              className={inputCls(!!formError)}
            />
          )}
          {mode === "signup" && (
            <input
              type="password"
              value={confirm}
              disabled={busy}
              onChange={(e) => { setConfirm(e.target.value); if (formError) setFormError(null); }}
              placeholder="Confirm password"
              className={inputCls(false)}
            />
          )}

          {mode === "signin" && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-body">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={busy}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--ink)]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-[12px] font-medium text-ink underline-offset-2 hover:underline disabled:opacity-60"
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>
          )}

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-500 animate-fade-in">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {resetSent && (
            <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500 animate-fade-in">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>If an account exists for <b>{resetSent}</b>, a reset link is on its way.</span>
            </div>
          )}

          <button
            type="submit"
            data-lg-press
            disabled={busy}
            className="pill mt-1 flex w-full items-center justify-center gap-2 bg-ink py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-semibold text-on-ink transition disabled:opacity-70"
          >
            {mode === "signup" ? (<>Create account <ArrowRight className="h-4 w-4" /></>) :
             mode === "forgot" ? (<>Send reset link <ArrowRight className="h-4 w-4" /></>) :
             (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center text-[12px] text-body">
          {mode === "signin" && (
            <>Don’t have an account?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-ink hover:underline" disabled={busy}>
                Create one
              </button>
            </>
          )}
          {mode === "signup" && (
            <>Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-ink hover:underline" disabled={busy}>
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-ink hover:underline" disabled={busy}>
              ← Back to sign in
            </button>
          )}
        </div>

        <p className="mt-auto pt-4 sm:pt-6 text-center text-[10px] leading-relaxed text-body">
          By continuing you agree to the Terms and Privacy Policy.
        </p>
      </div>

      {busy && <LiquidLoadingOverlay label={loadingLabel} />}
    </PhoneShell>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.4 13.4 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.6z"/>
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4-13.6-9.4l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

function OnboardingScreen({ defaultName, onDone }: { defaultName: string; onDone: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  return (
    <PhoneShell>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lg-blob absolute -left-16 top-10 h-56 w-56 rounded-full" />
        <div className="lg-blob absolute -right-20 bottom-32 h-64 w-64 rounded-full" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="relative flex h-full flex-col px-6 sm:px-7 pb-6 sm:pb-8 pt-10 sm:pt-16">
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all"
              style={{ background: i <= step ? "var(--ink)" : "var(--hairline)" }}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="mt-10 sm:mt-14">
            <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl bg-canvas-soft">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-ink" />
            </div>
            <h1 className="mt-5 sm:mt-6 font-display text-[28px] sm:text-[32px] font-bold leading-[1.1] tracking-tight text-ink">
              Welcome to Grain
            </h1>
            <p className="mt-2.5 sm:mt-3 text-[12px] sm:text-[13px] text-body leading-relaxed">
              A quiet, monochrome habit tracker. Swipe to complete, watch your heatmap fill, and glance at your streak on the lock screen.
            </p>

            <ul className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 text-[12px] sm:text-[13px] text-ink">
              <li className="flex items-start gap-3">
                <Flame className="mt-0.5 h-4 w-4" /> Daily streaks with rest days
              </li>
              <li className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4" /> 52-week consistency heatmap
              </li>
              <li className="flex items-start gap-3">
                <Wallpaper className="mt-0.5 h-4 w-4" /> Live wallpaper preview
              </li>
            </ul>
          </div>
        ) : (
          <div className="mt-10 sm:mt-14">
            <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl bg-canvas-soft">
              <span className="font-display text-base sm:text-lg font-bold text-ink">
                {(name || "?").slice(0, 1).toUpperCase()}
              </span>
            </div>
            <h1 className="mt-5 sm:mt-6 font-display text-[28px] sm:text-[32px] font-bold leading-[1.1] tracking-tight text-ink">
              What should we call you?
            </h1>
            <p className="mt-2.5 sm:mt-3 text-[12px] sm:text-[13px] text-body leading-relaxed">
              This shows up in your profile. You can change it later.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-5 sm:mt-6 w-full rounded-2xl border border-[color:var(--hairline)] bg-canvas-soft px-4 py-2.5 sm:py-3 text-[14px] sm:text-[15px] text-ink placeholder:text-body focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              data-lg-press
              className="pill border border-[color:var(--hairline)] bg-canvas-soft px-4 sm:px-5 py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-semibold text-ink"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              try { navigator.vibrate?.(12); } catch {}
              if (step === 0) setStep(1);
              else onDone(name.trim() || "You");
            }}
            data-lg-press
            className="pill flex flex-1 items-center justify-center gap-2 bg-ink py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-semibold text-on-ink"
          >
            {step === 0 ? "Get started" : "Enter Grain"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

type AppTab = "today" | "consistency" | "matrix" | "wallpaper";
type Theme = "dark" | "light";
type WallpaperState = "idle" | "applying" | "applied";

interface Habit {
  id: string;
  name: string;
  category: string;
  quadrant: Quadrant;
  streak: number;
  pinned: boolean;
  done?: boolean;
  best?: number;
  time?: "morning" | "afternoon" | "evening" | null;
  target?: number | null;
  value?: number;
  unit?: string | null;
  step?: number | null;
  frequency?: "daily" | "weekdays" | "custom";
  customDays?: number[];
  icon?: number;
  shade?: number;
}

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];

const INITIAL_HABITS: Record<Quadrant, Habit[]> = {
  q1: [],
  q2: [],
  q3: [],
  q4: [],
};

const CATEGORIES = ["All habits", "Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];

function generateHeatmap(): number[][] {
  const cells: number[][] = [];
  for (let w = 0; w < 52; w++) {
    cells.push([0, 0, 0, 0, 0, 0, 0]);
  }
  return cells;
}

const TODAY_COL = 51;
const TODAY_ROW = 3;

function Grain({ user }: { user?: any }) {
  const userId = user?.uid ?? null;
  const online = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHabit, setSelectedHabit] = useState("All habits");
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wallpaperSync, setWallpaperSync] = useState(true);
  const [wallpaperState, setWallpaperState] = useState<WallpaperState>("idle");
  const [wallpaperSnapshot, setWallpaperSnapshot] = useState<number[][] | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>("q2");
  const [theme, setTheme] = useState<Theme>("dark");
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // ── Real Firebase Hooks ─────────────────────────────────
  const {
    habits: rawHabits,
    byQuadrant: habitsByQ,
    loading: habitsLoading,
    add: addHabit,
    update: updateHabitDoc,
    remove: removeHabitDoc,
    restore: restoreHabitDoc,
  } = useHabits(userId);

  const {
    entries: completions,
    toggleDone: toggleHabitDone,
    adjustValue: adjustHabitValue,
    setRestDay: setHabitRestDay,
    freezeStreak: freezeHabitStreak,
    saveNote: saveHabitNote,
  } = useCompletions(userId, selectedDate);

  const {
    grid: heatmapGrid,
    todayCol,
    todayRow,
    stats: heatmapStats,
    habitStreaks,
    completionsMap,
  } = useHeatmap(userId, rawHabits, selectedHabit);

  // Derived heatmap state for UI compatibility
  const heatmap = heatmapGrid;

  const [syncPulse, setSyncPulse] = useState(0);
  const [throttled, setThrottled] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");
  const [wallpaperTheme, setWallpaperTheme] = useState<string>("amoled");
  const [remindersOn, setRemindersOn] = useState(true);
  const [detail, setDetail] = useState<{ q: Quadrant; i: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [wallpaperPreview, setWallpaperPreview] = useState(false);
  const [captureBusy, setCaptureBusy] = useState<null | "share" | "save">(null);
  const [previewWeeks, setPreviewWeeks] = useState(26);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [editHabitTarget, setEditHabitTarget] = useState<{ q: Quadrant; i: number } | null>(null);

  // Floating page title pill state & 2-second auto-fade timer
  const [showTitlePill, setShowTitlePill] = useState(true);
  const titlePillTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setShowTitlePill(true);
    if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
    titlePillTimerRef.current = window.setTimeout(() => {
      setShowTitlePill(false);
      titlePillTimerRef.current = null;
    }, 2000);

    return () => {
      if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
    };
  }, [activeTab]);

  const [profile, setProfile] = useState<{ name: string; email: string; tagline: string; initials: string }>(() => {
    const name = user?.displayName || user?.email?.split("@")[0] || "You";
    const initials = name.split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
    return { name, email: user?.email || "", tagline: "Building the 1% better version daily.", initials };
  });

  // Load user profile doc from Firestore on mount
  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId).then((docData) => {
      if (docData) {
        setProfile({
          name: docData.name || user?.displayName || "You",
          email: docData.email || user?.email || "",
          tagline: docData.tagline || "Building the 1% better version daily.",
          initials: docData.initials || "U",
        });
        if (docData.theme) setTheme(docData.theme as Theme);
        if (docData.wallpaperTheme) setWallpaperTheme(docData.wallpaperTheme);
        if (typeof docData.wallpaperSync === "boolean") setWallpaperSync(docData.wallpaperSync);
        if (typeof docData.remindersOn === "boolean") setRemindersOn(docData.remindersOn);
        if (typeof docData.previewWeeks === "number") setPreviewWeeks(docData.previewWeeks);
      }
    });
  }, [userId, user]);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const heatmapVisibleRef = useRef(false);
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  // Combine scroll + heatmap-in-view signals into a single throttle flag.
  useEffect(() => {
    const recompute = () => {
      setThrottled(scrollingRef.current || heatmapVisibleRef.current);
    };

    const el = scrollRef.current;
    const onScroll = () => {
      if (!scrollingRef.current) {
        scrollingRef.current = true;
        recompute();
      }
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        recompute();
      }, 180);
    };
    el?.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | null = null;
    if (heatmapRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          heatmapVisibleRef.current = entries[0]?.isIntersecting ?? false;
          recompute();
        },
        { root: el ?? null, threshold: 0.15 },
      );
      io.observe(heatmapRef.current);
    }

    return () => {
      el?.removeEventListener("scroll", onScroll);
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      io?.disconnect();
    };
  }, []);

  // Form state for habit creation
  const [newName, setNewName] = useState("");
  const [newFreq, setNewFreq] = useState("Daily");
  const [newShade, setNewShade] = useState(0);
  const [newIcon, setNewIcon] = useState(0);
  const [newCategory, setNewCategory] = useState<string>("Mind");
  const [newTime, setNewTime] = useState<Habit["time"] | undefined>(undefined);
  const [newIsNumeric, setNewIsNumeric] = useState(false);
  const [newTarget, setNewTarget] = useState<number>(1);
  const [newUnit, setNewUnit] = useState<string>("");

  const week = ["S", "M", "T", "W", "T", "F", "S"];

  // Merge Firestore habit definitions with today's completion status
  const flatHabits = rawHabits;
  const habits = useMemo(() => {
    const map: Record<Quadrant, Habit[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const q of QUADRANT_ORDER) {
      map[q] = (habitsByQ[q] ?? []).map((h) => {
        const entry = completions[h.id];
        const hStats = habitStreaks[h.id];
        return {
          ...h,
          done: entry?.done ?? false,
          value: entry?.value ?? 0,
          streak: hStats?.currentStreak ?? 0,
          best: Math.max(h.bestStreak ?? 0, hStats?.bestStreak ?? 0),
        };
      });
    }
    return map;
  }, [habitsByQ, completions, habitStreaks]);

  const doneCount = flatHabits.filter((h) => completions[h.id]?.done || completions[h.id]?.restDay).length;
  const totalCount = flatHabits.length;
  const totalStreak = heatmapStats.currentStreak;
  const rate = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Liquid-glass ripple + subtle haptic tap on any button/chip.
  useEffect(() => {
    const root = scrollRef.current?.parentElement ?? document.body;
    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[class*="btn-"], [class*="chip-"], [data-lg-press]'
      );
      if (!target) return;
      if (target.hasAttribute("disabled")) return;
      try { navigator.vibrate?.(18); } catch {}

      const cs = getComputedStyle(target);
      if (cs.position === "static") target.style.position = "relative";
      if (cs.overflow === "visible") target.style.overflow = "hidden";
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const span = document.createElement("span");
      span.className = "lg-ripple";
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left}px`;
      span.style.top = `${e.clientY - rect.top}px`;
      target.appendChild(span);
      window.setTimeout(() => span.remove(), 700);
    };
    root.addEventListener("pointerdown", onDown);
    return () => root.removeEventListener("pointerdown", onDown);
  }, []);

  const showToast = (msg: string, action?: { label: string; onClick: () => void }, duration = 1600) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, action });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((t) => (t?.msg === msg ? null : t));
      toastTimerRef.current = null;
    }, duration);
  };

  const toggleDone = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const wasDone = targetHabit.done;
    if (!wasDone) {
      try { navigator.vibrate?.([14, 40, 22]); } catch {}
    }
    await toggleHabitDone(targetHabit.id);
  };

  const restHabit = async (q: Quadrant, i: number) => {
    const target = habits[q][i];
    if (!target || target.done) return;
    try { navigator.vibrate?.(10); } catch {}
    await setHabitRestDay(target.id);
    showToast(`Rest day · "${target.name}" streak preserved`);
  };

  const adjustValue = async (q: Quadrant, i: number, dir: 1 | -1) => {
    const targetHabit = habits[q][i];
    if (!targetHabit || targetHabit.target === null || targetHabit.target === undefined) return;
    const step = targetHabit.step ?? 0.25;
    await adjustHabitValue(targetHabit.id, dir, step, targetHabit.target);
  };

  const freezeStreak = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    await freezeHabitStreak(targetHabit.id);
    showToast(`Streak frozen for "${targetHabit.name}"`);
    setDetail(null);
  };

  const togglePin = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    await updateHabitDoc(targetHabit.id, { pinned: !targetHabit.pinned });
    showToast(!targetHabit.pinned ? `Pinned "${targetHabit.name}"` : `Unpinned "${targetHabit.name}"`);
  };

  const deleteHabit = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    try { navigator.vibrate?.([28, 60, 40]); } catch {}
    const removed = await removeHabitDoc(targetHabit.id);
    if (!removed) return;
    showToast(
      `Deleted "${removed.name}"`,
      {
        label: "Undo",
        onClick: () => {
          try { navigator.vibrate?.(10); } catch {}
          restoreHabitDoc(removed);
          showToast(`Restored "${removed.name}"`);
        },
      },
      6000,
    );
  };

  const moveHabit = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const currentIdx = QUADRANT_ORDER.indexOf(q);
    const targetQ = QUADRANT_ORDER[(currentIdx + 1) % 4];
    await updateHabitDoc(targetHabit.id, { quadrant: targetQ });
    showToast(`Moved to "${QUADRANTS[targetQ].title}"`);
  };

  const createHabit = async () => {
    const name = newName.trim() || "New habit";
    const freq = newFreq === "Weekdays" ? "weekdays" : newFreq === "Custom" ? "custom" : "daily";
    await addHabit({
      name,
      category: newCategory,
      quadrant: selectedQuadrant,
      time: newTime ?? null,
      type: newIsNumeric ? "numeric" : "binary",
      target: newIsNumeric ? (newTarget || 1) : null,
      unit: newIsNumeric ? (newUnit || null) : null,
      step: newIsNumeric ? 0.25 : null,
      pinned: false,
      frequency: freq,
      customDays: [0, 1, 2, 3, 4],
      icon: newIcon,
      shade: newShade,
      bestStreak: 0,
      order: flatHabits.length,
    });
    // Reset ALL form fields so next open is a clean slate
    setNewName("");
    setNewCategory("Mind");
    setNewFreq("Daily");
    setNewShade(0);
    setNewIcon(0);
    setNewTime(undefined);
    setNewIsNumeric(false);
    setNewTarget(1);
    setNewUnit("");
    setModalOpen(false);
    showToast(`Added "${name}"`);
  };


  const toggleWallpaperSync = () => {
    setWallpaperSync((v) => {
      const next = !v;
      if (next) {
        setSyncPulse((n) => n + 1);
        showToast("Live sync on");
      } else {
        // freeze snapshot
        setWallpaperSnapshot(heatmap.map((c) => c.slice()));
        showToast("Live sync paused");
      }
      return next;
    });
  };

  const applyWallpaper = async () => {
    if (wallpaperState !== "idle") return;
    setWallpaperState("applying");
    try {
      const cap = await capturePreview();
      if (cap) {
        const a = document.createElement("a");
        a.href = cap.dataUrl;
        a.download = `grain-lockscreen-${wallpaperTheme}-${Date.now()}.png`;
        a.click();
      }
      setWallpaperState("applied");
      setWallpaperSnapshot(heatmap.map((c) => c.slice()));
      showToast("Wallpaper saved — select Set as Lock Screen in Gallery", undefined, 4000);
    } catch {
      showToast("Could not generate wallpaper image");
    } finally {
      window.setTimeout(() => setWallpaperState("idle"), 2500);
    }
  };

  const displayedHeatmap = wallpaperSync ? heatmap : (wallpaperSnapshot ?? heatmap);

  const capturePreview = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const node = previewRef.current;
    if (!node) return null;
    // Render at 3x for crisp wallpaper-quality output.
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: wallpaperThemeOf(wallpaperTheme).key === "neon" ? "#8b5cf6" : (wallpaperThemeOf(wallpaperTheme).bg.startsWith("#") ? wallpaperThemeOf(wallpaperTheme).bg : "#000000"),
      filter: (n) => !(n instanceof HTMLElement && n.dataset.noCapture !== undefined),
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, dataUrl };
  };

  const shareWallpaperImage = async () => {
    if (captureBusy) return;
    setCaptureBusy("share");
    try {
      const cap = await capturePreview();
      if (!cap) return;
      const file = new File([cap.blob], `grain-wallpaper.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Grain wallpaper",
          text: `${totalStreak}-day streak · ${rate}% today`,
        });
        showToast("Shared");
      } else {
        // Fallback: copy image to clipboard if possible, otherwise download.
        try {
          const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
          if (ClipboardItemCtor && navigator.clipboard && "write" in navigator.clipboard) {
            await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": cap.blob })]);
            showToast("Image copied — paste to share");
          } else {
            throw new Error("no clipboard");
          }
        } catch {
          const a = document.createElement("a");
          a.href = cap.dataUrl;
          a.download = "grain-wallpaper.png";
          a.click();
          showToast("Saved · sharing not supported here");
        }
      }
      if (navigator.vibrate) navigator.vibrate(18);
    } catch (err) {
      const name = (err as { name?: string } | undefined)?.name;
      if (name !== "AbortError") showToast("Could not share wallpaper");
    } finally {
      setCaptureBusy(null);
    }
  };

  const saveWallpaperImage = async () => {
    if (captureBusy) return;
    setCaptureBusy("save");
    try {
      const cap = await capturePreview();
      if (!cap) return;
      const a = document.createElement("a");
      a.href = cap.dataUrl;
      a.download = `grain-${wallpaperTheme}-${Date.now()}.png`;
      a.click();
      showToast("Saved to downloads");
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      showToast("Could not save wallpaper");
    } finally {
      setCaptureBusy(null);
    }
  };


  const exportBackup = () => {
    try {
      const payload = {
        profile,
        habits,
        heatmap,
        prefs: { wallpaperTheme, wallpaperSync, remindersOn, timeFilter, theme, previewWeeks },
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grain-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${flatHabits.length} habits`);
    } catch {
      showToast("Export failed");
    }
  };

  const resetToday = async () => {
    try {
      for (const h of flatHabits) {
        const entry = completions[h.id];
        // Clear done, restDay, and frozenStreak completions for today
        if (entry?.done || entry?.restDay || entry?.frozenStreak) {
          if (entry?.done) await toggleHabitDone(h.id); // toggles back to undone
        }
      }
      try { navigator.vibrate?.([28, 60, 40]); } catch {}
      showToast("Today's progress cleared");
    } catch {
      showToast("Reset failed");
    }
  };

  const saveProfile = async (next: { name: string; tagline: string; initials: string }) => {
    setProfile((p) => ({ ...p, ...next }));
    if (userId) {
      await updateUserProfile(userId, next);
    }
    showToast("Profile saved");
  };

  const updateHabit = async (q: Quadrant, i: number, patch: Partial<Habit>) => {
    const habit = habits[q][i];
    if (!habit) return;
    await updateHabitDoc(habit.id, patch);
    showToast("Habit updated");
  };

  const bestStreak = heatmapStats.bestStreak;

  return (
    <main
      data-theme={theme}
      className="absolute inset-0 flex justify-center bg-[var(--backdrop)] overflow-hidden"
    >
      {/* Main app container */}
      <div className="relative flex h-full w-full max-w-lg flex-col bg-canvas pt-safe pb-safe shadow-2xl">
        <div
          data-throttle={throttled ? "1" : "0"}
          className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-canvas"
          style={(() => {
            const wt = wallpaperTokens(wallpaperTheme);
            return {
              ["--wp-empty"]: wt.empty,
              ["--wp-low"]: wt.low,
              ["--wp-mid"]: wt.mid,
              ["--wp-hi"]: wt.hi,
              ["--wp-accent"]: wt.accent,
              ["--wp-accent-soft"]: wt.accentSoft,
            } as Record<string, string>;
          })()}
        >

          {/* Liquid drifting blobs — animated ambient light */}
          <div
            className="liquid-blob absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "color-mix(in oklab, var(--ink) 22%, transparent)" }}
            aria-hidden
          />
          <div
            className="liquid-blob absolute top-1/3 -right-24 h-80 w-80 rounded-full"
            style={{
              background: "color-mix(in oklab, var(--ink) 14%, transparent)",
              animationDelay: "-5s",
            }}
            aria-hidden
          />
          <div
            className="liquid-blob absolute -bottom-24 left-1/4 h-64 w-64 rounded-full"
            style={{
              background: "color-mix(in oklab, var(--ink) 18%, transparent)",
              animationDelay: "-9s",
            }}
            aria-hidden
          />

          <div
            ref={scrollRef}
            className="relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-none pb-28"
            style={{ willChange: "scroll-position", transform: "translateZ(0)" }}
          >

            {/* Top-Center Brand Icon & Auto-Expanding Title Pill */}
            <div className="sticky top-3 z-30 flex justify-center pointer-events-none">
              <button
                type="button"
                onClick={() => {
                  if (showTitlePill) {
                    setStreakOpen(true);
                  } else {
                    setShowTitlePill(true);
                    if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
                    titlePillTimerRef.current = window.setTimeout(() => {
                      setShowTitlePill(false);
                      titlePillTimerRef.current = null;
                    }, 2000);
                  }
                }}
                className={`pointer-events-auto flex items-center justify-center rounded-full border border-[color:var(--hairline-mid)] bg-canvas/85 p-1 text-xs font-semibold text-ink backdrop-blur-xl shadow-lg transition-all duration-500 ease-out active:scale-95 ${
                  showTitlePill ? "gap-2 pr-3.5 pl-1" : "gap-2 pr-3 pl-1"
                }`}
                aria-label="App logo and section title"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full overflow-hidden">
                  <img
                    src="/icon.png"
                    alt="Grain logo"
                    className="h-full w-full object-contain object-center filter drop-shadow-sm scale-105"
                  />
                </div>
                <span className="font-display font-bold text-xs tracking-wide text-ink shrink-0 leading-none flex items-center">
                  Grain
                </span>

                <div
                  className={`overflow-hidden transition-all duration-500 ease-out flex items-center gap-2 ${
                    showTitlePill ? "max-w-[240px] opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  <span className="h-3.5 w-px bg-[color:var(--hairline-mid)] shrink-0 opacity-70" />
                  <span className="text-mute font-medium text-[11px] leading-none shrink-0 whitespace-nowrap flex items-center">
                    {activeTab === "today"
                      ? `Daily habits · ${totalStreak}d streak`
                      : activeTab === "consistency"
                      ? `Consistency · ${totalStreak}d streak`
                      : activeTab === "matrix"
                      ? "Priority matrix"
                      : "Live wallpaper"}
                  </span>
                </div>
              </button>
            </div>

            {/* TAB 1: TODAY */}
            {activeTab === "today" && (
              <div className="space-y-5 animate-fade-in pt-12">
                {/* Today Hero */}
                <TodayHero
                  streak={totalStreak}
                  rate={rate}
                  done={doneCount}
                  total={totalCount}
                  nextHabit={(() => {
                    for (const q of QUADRANT_ORDER) {
                      const idx = habits[q].findIndex((h) => !h.done);
                      if (idx !== -1) return { q, i: idx, habit: habits[q][idx] };
                    }
                    return null;
                  })()}
                  onCompleteNext={(q: Quadrant, i: number) => toggleDone(q, i)}
                />

                {/* Date selector */}
                <div className="px-5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    {getWeekDates(new Date()).map((date) => {
                      const active = isSameDay(date, selectedDate);
                      const isTodayDate = isSameDay(date, new Date());
                      const isPast = date < new Date() && !isTodayDate;
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                          }}
                          className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition ${
                            active
                              ? "bg-ink text-on-ink"
                              : "bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                          }`}
                        >
                          <span className={`text-[10px] font-medium ${active ? "opacity-70" : "text-body"}`}>
                            {shortDay(date)}
                          </span>
                          <span className="font-display text-sm font-bold tabular-nums">{date.getDate()}</span>
                          {isPast && !active && <span className="h-1 w-1 rounded-full bg-ink" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Today Habits Checklist */}
                <section className="px-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-ink">Today's habits</h2>
                    <span className="text-[10px] uppercase tracking-wider text-body">
                      {doneCount}/{totalCount} Done
                    </span>
                  </div>

                  {totalCount === 0 ? (
                    <div className="card-soft flex flex-col items-center justify-center gap-3 px-5 py-8 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-canvas-soft">
                        <Sparkles className="h-5 w-5 text-ink" />
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-ink">No habits created yet</p>
                        <p className="mt-1 max-w-[240px] text-[12px] text-body">
                          Create your first habit to start tracking your daily progress.
                        </p>
                      </div>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="pill mt-1 flex items-center gap-1.5 bg-ink px-4 py-2 text-[12px] font-semibold text-on-ink"
                        data-lg-press
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add habit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {QUADRANT_ORDER.flatMap((q) =>
                        habits[q].map((h, i) => (
                          <div
                            key={`${q}-${i}-${h.name}`}
                            className="card-soft flex items-center justify-between p-3.5 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => toggleDone(q, i)}
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
                                  h.done
                                    ? "bg-ink border-ink text-on-ink"
                                    : "border-[color:var(--hairline-mid)] text-transparent hover:border-ink"
                                }`}
                              >
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </button>
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${h.done ? "line-through opacity-60 text-body" : "text-ink"}`}>
                                  {h.name}
                                </p>
                                <p className="text-[10px] text-body">{QUADRANTS[q].title} · {h.streak}d streak</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setDetail({ q, i });
                                  setNoteDraft("");
                                }}
                                className="chip-uber px-2.5 py-1 text-[11px]"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => deleteHabit(q, i)}
                                aria-label={`Delete ${h.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full text-rose-500/40 transition hover:bg-rose-500/10 hover:text-rose-500 focus:text-rose-500 active:scale-90"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB 2: CONSISTENCY */}
            {activeTab === "consistency" && (
              <div className="animate-fade-in pt-12">
                <section ref={heatmapRef} className="px-5">
                  <div className="card-soft p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-base font-bold text-ink">Consistency</h2>
                        <p className="text-[11px] text-body">Last 52 weeks</p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setFilterOpen((v) => !v)}
                          className="chip-uber flex items-center gap-1.5 px-3 py-1.5 text-xs"
                        >
                          <span className="max-w-[100px] truncate">{selectedHabit}</span>
                          <ChevronDown className={`h-3 w-3 transition ${filterOpen ? "rotate-180" : ""}`} />
                        </button>
                        {filterOpen && (
                          <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
                            {CATEGORIES.map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  setSelectedHabit(c);
                                  setFilterOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-canvas-soft ${
                                  c === selectedHabit ? "text-ink font-semibold" : "text-body"
                                }`}
                              >
                                {c}
                                {c === selectedHabit && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="scrollbar-none overflow-x-auto">
                      <div className="flex gap-[3px]">
                        {heatmap.map((col, ci) => (
                          <div key={ci} className="flex flex-col gap-[3px]">
                            {col.map((v, ri) => {
                              const isToday = ci === TODAY_COL && ri === TODAY_ROW;
                              return (
                                <button
                                  type="button"
                                  key={isToday ? `today-${v}` : ri}
                                  aria-label={`Day intensity ${v} of 3`}
                                  onClick={() => {
                                    try { navigator.vibrate?.(6 + v * 4); } catch {}
                                    showToast(`Intensity: ${v} of 3`);
                                  }}
                                  className={`h-2 w-2 rounded-[2px] transition-transform hover:scale-125 active:scale-90 ${isToday ? "animate-cell-flash ring-1 ring-[color:var(--wp-accent)]" : ""}`}
                                  style={{
                                    background:
                                      v === 0
                                        ? "var(--wp-empty)"
                                        : v === 1
                                          ? "var(--wp-low)"
                                          : v === 2
                                            ? "var(--wp-mid)"
                                            : "var(--wp-hi)",
                                    transition: "background 500ms ease, transform 120ms ease",
                                  }}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-body">
                      <span>Less</span>
                      {[0, 1, 2, 3].map((v) => (
                        <div
                          key={v}
                          className="h-2 w-2 rounded-[2px]"
                          style={{
                            background:
                              v === 0
                                ? "var(--wp-empty)"
                                : v === 1
                                  ? "var(--wp-low)"
                                  : v === 2
                                    ? "var(--wp-mid)"
                                    : "var(--wp-hi)",
                            transition: "background 500ms ease",
                          }}
                        />
                      ))}
                      <span>More</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--hairline)] pt-3">
                      <Stat label="Today" value={`${doneCount}/${totalCount}`} pulseKey={doneCount} />
                      <Stat label="Best" value={totalStreak > 0 ? `${totalStreak}d` : "—"} />
                      <Stat label="Rate" value={`${rate}%`} pulseKey={rate} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 3: MATRIX */}
            {activeTab === "matrix" && (
              <div className="animate-fade-in pt-12">
                <section className="px-5">
                  {/* Time of day filter */}
                  <div className="scrollbar-none mb-3.5 flex gap-1.5 overflow-x-auto">
                    {TIME_TABS.map((t) => {
                      const active = timeFilter === t.key;
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setTimeFilter(t.key)}
                          className={`pill flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition ${
                            active
                              ? "bg-ink text-on-ink"
                              : "bg-canvas-soft text-mute hover:text-ink hover:bg-[color:var(--surface-pressed)]"
                          }`}
                        >
                          {Icon && <Icon className="h-3 w-3" />}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {totalCount === 0 ? (
                    <div className="card-soft flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-canvas-soft">
                        <Sparkles className="h-5 w-5 text-ink" />
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-ink">No habits yet</p>
                        <p className="mt-1 max-w-[240px] text-[12px] text-body">
                          Add your first habit to start a streak. It'll show up here in the matrix.
                        </p>
                      </div>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="pill mt-1 flex items-center gap-1.5 bg-ink px-4 py-2 text-[12px] font-semibold text-on-ink"
                        data-lg-press
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Create your first habit
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      {QUADRANT_ORDER.map((q) => (
                        <QuadrantCard
                          key={q}
                          q={q}
                          habits={habits[q]}
                          timeFilter={timeFilter}
                          onToggle={(i) => toggleDone(q, i)}
                          onRest={(i) => restHabit(q, i)}
                          onPin={(i) => togglePin(q, i)}
                          onDelete={(i) => deleteHabit(q, i)}
                          onMove={(i) => moveHabit(q, i)}
                          onEdit={(i) => setEditHabitTarget({ q, i })}
                          onAdjust={(i, dir) => adjustValue(q, i, dir)}
                          onOpenDetail={(i) => {
                            setDetail({ q, i });
                            setNoteDraft("");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB 4: WALLPAPER */}
            {activeTab === "wallpaper" && (
              <div className="animate-fade-in pt-12">
                <section className="px-5">
                  <div className="card-invert overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4">
                      <div className="flex items-center gap-2">
                        <Wallpaper className="h-4 w-4" />
                        <h3 className="font-display text-sm font-bold">Live wallpaper</h3>
                      </div>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-medium ${wallpaperSync ? "opacity-80" : "opacity-50"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${wallpaperSync ? "bg-emerald-400 animate-pulse" : "bg-[color:var(--on-ink)]/40"}`}
                        />
                        {wallpaperSync ? "Live" : "Paused"}
                      </span>
                    </div>

                    <div
                      key={syncPulse}
                      className={`wp-scene relative mx-4 mt-3 overflow-hidden rounded-2xl p-3 ${syncPulse ? "animate-sync-pulse" : ""}`}
                      style={{
                        background: wallpaperThemeOf(wallpaperTheme).bg,
                        ["--ink" as string]: wallpaperThemeOf(wallpaperTheme).key === "neon" ? "#4c1d95" : wallpaperThemeOf(wallpaperTheme).bg,
                        ["--on-ink" as string]: wallpaperThemeOf(wallpaperTheme).fg,
                        color: wallpaperThemeOf(wallpaperTheme).fg,
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between text-[8px] opacity-70">
                        <span className="tabular-nums">9:41</span>
                        <span>{wallpaperSync ? "SYNCED" : "SNAPSHOT"}</span>
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-6 z-[1] flex flex-col items-center">
                        <span className="text-[8px] font-medium uppercase tracking-[0.24em] opacity-50">
                          Wed · Oct 21
                        </span>
                        <span className="font-display text-[38px] font-light leading-none tracking-tight tabular-nums opacity-90">
                          9:41
                        </span>
                      </div>

                      <div className={`flex justify-center gap-[2px] py-4 ${wallpaperSync ? "" : "opacity-60"}`}>
                        {displayedHeatmap.slice(-26).map((col, ci) => {
                          const absCi = 26 + ci;
                          return (
                            <div key={ci} className="flex flex-col gap-[2px]">
                              {col.map((v, ri) => {
                                const isToday = absCi === TODAY_COL && ri === TODAY_ROW;
                                return (
                                  <div
                                    key={isToday ? `t-${v}` : ri}
                                    className={`h-1.5 w-1.5 rounded-[1px] ${isToday ? "animate-cell-flash ring-1 ring-[color:var(--wp-accent)]" : ""}`}
                                    style={{
                                      background:
                                        v === 0
                                          ? "var(--wp-empty)"
                                          : v === 1
                                            ? "var(--wp-low)"
                                            : v === 2
                                              ? "var(--wp-mid)"
                                              : "var(--wp-hi)",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-center text-[9px] font-semibold opacity-80">
                        {totalStreak} day streak · {rate}%
                      </div>
                      <div className="mt-3 flex justify-center gap-2">
                        {WALLPAPER_THEMES.map((t) => {
                          const active = wallpaperTheme === t.key;
                          return (
                            <button
                              key={t.key}
                              onClick={() => {
                                setWallpaperTheme(t.key);
                                showToast(`${t.label} theme`);
                              }}
                              aria-label={t.label}
                              title={t.label}
                              className={`h-5 w-5 rounded-md border transition ${
                                active
                                  ? "border-[color:var(--on-ink)] ring-2 ring-[color:var(--on-ink)]/50"
                                  : "border-[color:var(--on-ink)]/30"
                              }`}
                              style={{ background: t.swatch }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-1.5 text-center text-[8px] uppercase tracking-wider opacity-60">
                        {WALLPAPER_THEMES.find((t) => t.key === wallpaperTheme)?.label}
                      </div>

                      {wallpaperState === "applied" && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[color:var(--ink)]/40 backdrop-blur-[2px] animate-fade-in">
                          <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--on-ink)] px-3 py-1.5 text-[11px] font-semibold text-ink">
                            <Check className="h-3 w-3" strokeWidth={3} /> Applied
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--on-ink)]/10 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold">Sync grid to wallpaper</p>
                        <p className="text-[10px] opacity-70">
                          {wallpaperSync ? "Updates every hour" : "Showing last snapshot"}
                        </p>
                      </div>
                      <button
                        onClick={toggleWallpaperSync}
                        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                          wallpaperSync
                            ? "bg-[color:var(--on-ink)] border-[color:var(--on-ink)]"
                            : "bg-transparent border-[color:var(--on-ink)]/40"
                        }`}
                        aria-label="Toggle sync"
                        aria-pressed={wallpaperSync}
                      >
                        <span
                          className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all duration-200 ease-out ${
                            wallpaperSync
                              ? "left-[calc(100%-1.375rem)] bg-[color:var(--ink)] shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                              : "left-1 bg-[color:var(--on-ink)]/70"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-[color:var(--on-ink)]/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs font-semibold">Grid size</p>
                          <p className="text-[10px] opacity-70">Cells shown on lock screen · {previewWeeks} weeks</p>
                        </div>
                        <button
                          onClick={() => { setPreviewWeeks(26); showToast("Grid size reset"); }}
                          aria-label="Reset grid size"
                          className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--on-ink)]/70 hover:bg-[color:var(--on-ink)]/10 hover:text-[color:var(--on-ink)]"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-[color:var(--on-ink)]/20 px-1 py-1">
                        <button
                          aria-label="Fewer weeks"
                          onClick={() => setPreviewWeeks((w) => Math.max(12, w - 4))}
                          className="grid h-6 w-6 place-items-center rounded-full hover:bg-[color:var(--on-ink)]/10 disabled:opacity-40"
                          disabled={previewWeeks <= 12}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div
                          role="slider"
                          aria-label="Grid size"
                          aria-valuemin={12}
                          aria-valuemax={52}
                          aria-valuenow={previewWeeks}
                          onPointerDown={(e) => {
                            const startX = e.clientX;
                            const startWeeks = previewWeeks;
                            const target = e.currentTarget;
                            target.setPointerCapture(e.pointerId);
                            let last = startWeeks;
                            const move = (ev: PointerEvent) => {
                              const dx = ev.clientX - startX;
                              const next = Math.round(startWeeks + dx / 4);
                              const clamped = Math.max(12, Math.min(52, next));
                              if (clamped !== last) {
                                last = clamped;
                                setPreviewWeeks(clamped);
                                if (navigator.vibrate) navigator.vibrate(4);
                              }
                            };
                            const up = () => {
                              target.removeEventListener("pointermove", move);
                              target.removeEventListener("pointerup", up);
                              target.removeEventListener("pointercancel", up);
                            };
                            target.addEventListener("pointermove", move);
                            target.addEventListener("pointerup", up);
                            target.addEventListener("pointercancel", up);
                          }}
                          className="flex h-5 w-28 cursor-ew-resize touch-none items-center rounded-full bg-[color:var(--on-ink)]/10 px-1"
                        >
                          <div
                            className="h-1 rounded-full bg-[color:var(--on-ink)]/70"
                            style={{ width: `${((previewWeeks - 12) / (52 - 12)) * 100}%` }}
                          />
                        </div>
                        <button
                          aria-label="More weeks"
                          onClick={() => setPreviewWeeks((w) => Math.min(52, w + 4))}
                          className="grid h-6 w-6 place-items-center rounded-full hover:bg-[color:var(--on-ink)]/10 disabled:opacity-40"
                          disabled={previewWeeks >= 52}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={() => setWallpaperPreview(true)}
                        className="flex flex-1 items-center justify-center gap-2 pill border border-[color:var(--on-ink)]/30 bg-transparent py-3 text-sm font-medium text-[color:var(--on-ink)] transition active:scale-[0.98] hover:bg-[color:var(--on-ink)]/10"
                      >
                        <Wallpaper className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        onClick={applyWallpaper}
                        disabled={wallpaperState !== "idle"}
                        className="flex flex-1 items-center justify-center gap-2 pill bg-[color:var(--on-ink)] py-3 text-sm font-medium text-ink transition active:scale-[0.98] disabled:opacity-80"
                      >
                        {wallpaperState === "applying" && <Loader2 className="h-4 w-4 animate-spin" />}
                        {wallpaperState === "applied" && <Check className="h-4 w-4" strokeWidth={3} />}
                        {wallpaperState === "idle"
                          ? "Set as wallpaper"
                          : wallpaperState === "applying"
                            ? "Applying…"
                            : "Wallpaper set"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            <div className="h-6" />
          </div>

          {/* Liquid Glass Bottom Navigation Bar */}
          <div className="absolute bottom-3 left-0 right-0 z-40 mx-4 pointer-events-none">
            <nav className="pointer-events-auto flex items-center justify-around rounded-full border border-[color:var(--hairline)] bg-canvas/85 p-1.5 backdrop-blur-2xl shadow-2xl liquid-glass specular">
              {([
                { id: "today", label: "Today", icon: Flame },
                { id: "consistency", label: "Consistency", icon: CalendarDays },
                { id: "matrix", label: "Matrix", icon: LayoutGrid },
                { id: "wallpaper", label: "Wallpaper", icon: Wallpaper },
                { id: "profile", label: "Profile", icon: User },
              ] as const).map((t) => {
                const active = t.id === "profile" ? settingsOpen : activeTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.id === "profile") {
                        setSettingsOpen(true);
                      } else {
                        setActiveTab(t.id as AppTab);
                      }
                      try { navigator.vibrate?.(10); } catch {}
                    }}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 px-1 text-[11px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-ink text-on-ink shadow-lg scale-105"
                        : "text-body hover:text-ink active:scale-95"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 1.75} />
                    <span className="text-[10px] leading-none">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* FAB */}
          <button
            onClick={() => setModalOpen(true)}
            className="absolute bottom-20 right-5 z-30 mb-safe grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] transition active:scale-95"
            aria-label="Add habit"
          >
            <Plus className="h-6 w-6" strokeWidth={2.25} />
          </button>

          {/* Toast */}
          {toast && (
            <div className="pointer-events-auto absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink pl-4 pr-1 py-1 text-[11px] font-semibold text-on-ink shadow-lg animate-fade-in">
              <span className="py-1">{toast.msg}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                    setToast(null);
                  }}
                  className="rounded-full bg-on-ink/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-on-ink hover:bg-on-ink/25"
                  data-lg-press
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}

          {/* Fullscreen wallpaper lock-screen preview */}
          {wallpaperPreview && (
            <div
              className="absolute inset-0 z-[60] animate-fade-in"
              onClick={() => setWallpaperPreview(false)}
            >
              {(() => {
                const wp = wallpaperThemeOf(wallpaperTheme);
                const wt = wallpaperTokens(wallpaperTheme);
                const isLight = wp.key === "mono";
                const fg = wt.fg;
                const fgSoft = wt.fgSoft;
                const chipBg = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.10)";
                const chipBgStrong = isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.20)";
                const notchBg = isLight ? "#111111" : "#000000";
                const emptyCell = wt.empty;
                const fillMid = wt.mid;
                const fillHi = wt.hi;
                const todayDot = isLight ? "#111111" : "#ffffff";
                const accent = wt.accent;
                const accentSoft = wt.accentSoft;
                return (
              <div ref={previewRef} className="wp-scene absolute inset-0" onClick={(e) => e.stopPropagation()}>
               {/* Themed lock-screen background */}
               <div className="absolute inset-0" style={{ background: wp.bg }} />

               {/* Status bar */}
               <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-medium" style={{ color: fg }}>
                 <div className="flex items-center gap-1.5">
                   <Plane className="h-3 w-3 rotate-45" />
                 </div>
                 <div className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full" style={{ background: notchBg }} />
                 <div className="flex items-center gap-1.5">
                   <Wifi className="h-3 w-3" />
                   <div className="flex items-center gap-0.5 rounded-[4px] px-1 py-[1px] text-[9px] font-semibold leading-none" style={{ border: `1px solid ${fgSoft}` }}>
                     <span className="tabular-nums">63</span>
                   </div>
                 </div>
               </div>

               {/* Date + big outlined clock */}
               <div className="absolute inset-x-0 top-10 flex flex-col items-center" style={{ color: fg }}>
                 <span className="text-[13px] font-medium tabular-nums">
                   {(() => {
                     const d = new Date();
                     const day = d.toLocaleDateString(undefined, { weekday: "short" });
                     const dm = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
                     return `${day} ${dm}`;
                   })()}
                 </span>
                 <span
                   className="font-display mt-1 text-[88px] font-thin leading-none tracking-tight tabular-nums"
                   style={{
                     color: "transparent",
                     WebkitTextStroke: `1.5px ${fgSoft}`,
                   }}
                 >
                   {(() => {
                     const d = new Date();
                     return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                   })()}
                 </span>
               </div>

               {/* Big heatmap wallpaper motif */}
               <div className="absolute inset-x-0 top-52 bottom-32 flex justify-center">
                 {(() => {
                   const weeks = previewWeeks;
                   const availW = 340;
                   const availH = 420;
                   const gap = weeks > 40 ? 1 : 2;
                   const cell = Math.max(3, Math.min(10, Math.floor((availW - (weeks - 1) * gap) / weeks)));
                   const rows = Math.max(20, Math.min(48, Math.floor((availH + gap) / (cell + gap))));
                   const cols = displayedHeatmap.slice(-weeks);
                   const todayColIdx = cols.length - 1;
                   const todayRowIdx = 1;
                   return (
                     <div className="flex" style={{ gap: `${gap}px` }}>
                       {cols.map((col, ci) => (
                         <div key={ci} className="flex flex-col" style={{ gap: `${gap}px` }}>
                           {Array.from({ length: rows }).map((_, ri) => {
                             const v = col[ri % 7];
                             const isToday = ci === todayColIdx && ri === todayRowIdx;
                             const filled = v >= 2 || ri < 2;
                             let bg = emptyCell;
                             if (isToday) bg = todayDot;
                             else if (filled) bg = ri < 2 ? fillHi : v >= 3 ? fillHi : fillMid;
                             return (
                               <div
                                 key={ri}
                                 className="rounded-[1px]"
                                 style={{ width: `${cell}px`, height: `${cell}px`, background: bg }}
                               />
                             );
                           })}
                         </div>
                       ))}
                     </div>
                   );
                 })()}
               </div>

               {/* Bottom battery indicator */}
               <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-1">
                 <div className="h-[3px] w-8 rounded-full" style={{ background: accent }} />
                 <span className="text-[11px] font-medium tabular-nums" style={{ color: accentSoft }}>
                   1885d left · 5%
                 </span>
               </div>

               {/* Flashlight + camera */}
               <div className="absolute inset-x-0 bottom-10 flex items-center justify-between px-10">
                 <div className="grid h-11 w-11 place-items-center rounded-full backdrop-blur-md" style={{ background: chipBg, color: fg }}>
                   <Flashlight className="h-4 w-4" />
                 </div>
                 <div className="grid h-11 w-11 place-items-center rounded-full backdrop-blur-md" style={{ background: chipBg, color: fg }}>
                   <Camera className="h-4 w-4" />
                 </div>
               </div>

               {/* Home indicator */}
               <div className="absolute inset-x-0 bottom-2 flex justify-center">
                 <div className="h-[3px] w-24 rounded-full" style={{ background: chipBgStrong }} />
               </div>
              </div>
                );
              })()}
             {/* Action bar — excluded from capture */}
             <div
               className="absolute inset-x-0 bottom-3 z-[61] flex justify-center gap-2 px-4"
               onClick={(e) => e.stopPropagation()}
             >
                <button
                  onClick={shareWallpaperImage}
                  disabled={captureBusy !== null}
                  className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-60"
                >
                  {captureBusy === "share"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Share2 className="h-3.5 w-3.5" />}
                  Share
                </button>
                <button
                  onClick={saveWallpaperImage}
                  disabled={captureBusy !== null}
                  className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-60"
                >
                  {captureBusy === "save"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => setWallpaperPreview(false)}
                  className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          )}



          {/* Settings sheet */}
          {settingsOpen && (
            <SheetShell onClose={() => setSettingsOpen(false)} title="Settings" subtitle="Preferences & data">
              <div className="space-y-3">
                {/* Profile */}
                <div className="card-soft relative overflow-hidden p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink font-display text-lg font-bold">
                        {profile.initials}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-[color:var(--surface)]">
                        <Flame className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display truncate text-base font-bold text-ink">{profile.name}</h2>
                        <span className="rounded-full border border-[color:var(--hairline)] bg-canvas-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-body">
                          Pro
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-body">{profile.tagline}</p>
                    </div>
                    <button
                      onClick={() => setProfileEditOpen(true)}
                      className="chip-uber shrink-0 px-3 py-1.5 text-[11px]"
                      aria-label="Edit profile"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-canvas-soft p-2.5 text-center">
                      <p className="font-display text-lg font-bold leading-none text-ink tabular-nums">{totalStreak}</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-body">Streak</p>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft p-2.5 text-center">
                      <p className="font-display text-lg font-bold leading-none text-ink tabular-nums">
                        {doneCount}<span className="text-body">/{totalCount}</span>
                      </p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-body">Today</p>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft p-2.5 text-center">
                      <p className="font-display text-lg font-bold leading-none text-ink tabular-nums">{rate}%</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-body">Rate</p>
                    </div>
                  </div>
                </div>


                <Row
                  label="Theme"
                  action={
                    <button
                      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                      className="pill bg-canvas-soft px-3 py-1.5 text-xs font-medium text-ink"
                    >
                      {theme === "dark" ? "Dark" : "Light"}
                    </button>
                  }
                />
                <Row
                  label="Live wallpaper sync"
                  action={
                    <Toggle
                      checked={wallpaperSync}
                      onChange={toggleWallpaperSync}
                      ariaLabel="Toggle live wallpaper sync"
                    />
                  }
                />
                <Row
                  label={
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Habit reminders
                    </span>
                  }
                  action={
                    <Toggle
                      checked={remindersOn}
                      onChange={async () => {
                        const next = !remindersOn;
                        setRemindersOn(next);
                        if (userId) {
                          updateUserProfile(userId, { remindersOn: next });
                        }
                        const ok = await scheduleDailyReminder(next);
                        if (next) {
                          showToast(ok ? "Reminders scheduled for 8:00 PM" : "Permission needed for reminders");
                        } else {
                          showToast("Reminders turned off");
                        }
                      }}
                      ariaLabel="Toggle reminders"
                    />
                  }
                />
                <button
                  data-lg-press
                  onClick={exportBackup}
                  className="flex w-full items-center justify-between rounded-2xl bg-canvas-soft px-4 py-3 text-sm font-medium text-ink transition hover:bg-[color:var(--surface-pressed)]"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Backup & export data
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  data-lg-press
                  onClick={() => setResetConfirmOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl bg-canvas-soft px-4 py-3 text-sm font-medium text-ink transition hover:bg-[color:var(--surface-pressed)]"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" /> Reset today's progress
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  data-lg-press
                  onClick={() => setSignOutOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Sign out
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="btn-primary-uber mt-2 w-full py-3 text-sm"
                >
                  Done
                </button>
              </div>
            </SheetShell>
          )}

          {signOutOpen && (
            <ConfirmDialog
              onClose={() => setSignOutOpen(false)}
              icon={<LogOut className="h-5 w-5" />}
              title="Sign out?"
              description="You'll be signed out of your Grain account. Your data remains safely stored in the cloud."
              confirmLabel="Sign out"
              destructive
              onConfirm={() => {
                try { navigator.vibrate?.(18); } catch {}
                signOut();
              }}
            />
          )}

          {resetConfirmOpen && (
            <ConfirmDialog
              onClose={() => setResetConfirmOpen(false)}
              icon={<RotateCcw className="h-5 w-5" />}
              title="Reset today?"
              description="Clears today's completions and progress. Streaks roll back by one for anything already marked done."
              confirmLabel="Reset today"
              destructive
              onConfirm={() => {
                resetToday();
                setSettingsOpen(false);
              }}
            />
          )}

          {profileEditOpen && (
            <ProfileEditSheet
              profile={profile}
              onClose={() => setProfileEditOpen(false)}
              onSave={(next) => {
                saveProfile(next);
                setProfileEditOpen(false);
              }}
            />
          )}

          {streakOpen && (
            <SheetShell
              onClose={() => setStreakOpen(false)}
              title={`${totalStreak}-day streak`}
              subtitle="Overview"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{totalStreak}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Current</p>
                  </div>
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{bestStreak || "—"}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Best</p>
                  </div>
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{rate}%</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Rate</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-body">Last 7 days</p>
                  <div className="flex gap-1.5">
                    {heatmap.slice(-7).map((col, i) => {
                      const v = col[TODAY_ROW];
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-lg py-4 text-center text-[9px] font-semibold"
                          style={{
                            background:
                              v === 0
                                ? "var(--canvas-softer)"
                                : v === 1
                                  ? "color-mix(in oklab, var(--ink) 25%, transparent)"
                                  : v === 2
                                    ? "color-mix(in oklab, var(--ink) 55%, transparent)"
                                    : "var(--ink)",
                            color: v >= 2 ? "var(--on-ink)" : "var(--body)",
                          }}
                        >
                          {["M","T","W","T","F","S","S"][i]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  data-lg-press
                  onClick={async () => {
                    // Freeze streak for every non-done habit today
                    for (const h of flatHabits) {
                      if (!completions[h.id]?.frozenStreak) {
                        await freezeHabitStreak(h.id);
                      }
                    }
                    showToast("All streaks frozen for today");
                    setStreakOpen(false);
                  }}
                  className="pill w-full bg-canvas-soft py-3 text-[13px] font-semibold text-ink"
                >
                  <Snowflake className="mr-1.5 inline h-3.5 w-3.5" /> Freeze today's streak
                </button>
                <button
                  onClick={() => setStreakOpen(false)}
                  className="btn-primary-uber w-full py-3 text-sm"
                >
                  Done
                </button>
              </div>
            </SheetShell>
          )}

          {editHabitTarget && (() => {
            const t = editHabitTarget;
            const h = habits[t.q]?.[t.i];
            if (!h) return null;
            return (
              <EditHabitSheet
                habit={h}
                quadrant={t.q}
                onClose={() => setEditHabitTarget(null)}
                onSave={async (patch, newQ) => {
                  const updates: Partial<Omit<HabitDoc, "id" | "createdAt">> = { ...patch };
                  if (newQ && newQ !== t.q) updates.quadrant = newQ;
                  await updateHabitDoc(h.id, updates);
                  showToast("Habit updated");
                  setEditHabitTarget(null);
                }}
                onDelete={() => {
                  deleteHabit(t.q, t.i);
                  setEditHabitTarget(null);
                }}
              />
            );
          })()}


          {/* Modal */}
          {modalOpen && (
            <SheetShell
              onClose={() => setModalOpen(false)}
              title="Create habit"
              subtitle="Build something you'll be proud of."
            >
              <div className="space-y-4">
                <Field label="Habit name">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Morning run"
                    className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                  />
                </Field>

                <Field label="Priority quadrant">
                  <div className="grid grid-cols-2 gap-2">
                    {QUADRANT_ORDER.map((q) => {
                      const active = selectedQuadrant === q;
                      return (
                        <button
                          key={q}
                          onClick={() => setSelectedQuadrant(q)}
                          className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${
                            active
                              ? "bg-ink text-on-ink"
                              : "bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                          }`}
                        >
                          {QUADRANTS[q].title}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Category">
                  <div className="flex flex-wrap gap-1.5">
                    {["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"].map((c) => {
                      const active = newCategory === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setNewCategory(c)}
                          className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                            active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Time of day">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: "any", label: "Anytime" },
                      { key: "morning", label: "Morning" },
                      { key: "afternoon", label: "Afternoon" },
                      { key: "evening", label: "Evening" },
                    ] as const).map((t) => {
                      const active = (newTime ?? "any") === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() =>
                            setNewTime(t.key === "any" ? undefined : (t.key as Habit["time"]))
                          }
                          className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                            active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Type">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewIsNumeric(false)}
                      className={`pill px-3 py-2.5 text-xs font-medium transition ${
                        !newIsNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                      }`}
                    >
                      Binary
                    </button>
                    <button
                      onClick={() => setNewIsNumeric(true)}
                      className={`pill px-3 py-2.5 text-xs font-medium transition ${
                        newIsNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                      }`}
                    >
                      Numeric
                    </button>
                  </div>
                </Field>

                {newIsNumeric && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Target">
                      <input
                        type="number"
                        value={newTarget}
                        min={0}
                        step="0.25"
                        onChange={(e) => setNewTarget(Number(e.target.value) || 0)}
                        className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none focus:bg-[color:var(--canvas-softer)]"
                      />
                    </Field>
                    <Field label="Unit">
                      <input
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="pages, min…"
                        className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                      />
                    </Field>
                  </div>
                )}

                <Field label="Frequency">
                  <div className="flex gap-2">
                    {["Daily", "Weekdays", "Custom"].map((f) => {
                      const active = newFreq === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setNewFreq(f)}
                          className={`pill flex-1 px-3 py-2 text-xs font-medium transition ${
                            active
                              ? "bg-ink text-on-ink"
                              : "bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </Field>


                <div className="grid grid-cols-2 gap-3">
                  <Field label="Shade">
                    <div className="flex gap-1.5">
                      {[
                        "var(--ink)",
                        "color-mix(in oklab, var(--ink) 70%, transparent)",
                        "color-mix(in oklab, var(--ink) 40%, transparent)",
                        "var(--canvas-soft)",
                        "var(--surface-pressed)",
                      ].map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setNewShade(i)}
                          style={{ background: c }}
                          className={`h-8 w-8 rounded-full border border-[color:var(--hairline)] transition ${
                            i === newShade ? "ring-2 ring-ink ring-offset-2 ring-offset-[color:var(--canvas)]" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Icon">
                    <div className="flex gap-1.5">
                      {[Flame, Sparkles, Zap, Clock].map((I, i) => (
                        <button
                          key={i}
                          onClick={() => setNewIcon(i)}
                          className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                            i === newIcon ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                          }`}
                        >
                          <I className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <button onClick={createHabit} className="btn-primary-uber mt-2 w-full py-3 text-sm">
                  Create habit
                </button>
              </div>
            </SheetShell>
          )}

          {/* Habit detail modal */}
          {detail && (() => {
            const h = habits[detail.q][detail.i];
            if (!h) return null;
            // Build real 30-day completion history from Firestore completions
            const todayDate = new Date();
            return (
              <SheetShell
                onClose={() => setDetail(null)}
                title={h.name}
                subtitle={QUADRANTS[detail.q].title}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catClass(h.category)}`}>
                      {h.category}
                    </span>
                    {h.time && (
                      <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] font-medium text-body capitalize">
                        {h.time}
                      </span>
                    )}
                    {h.target !== null && h.target !== undefined && (
                      <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] font-medium text-body">
                        {completions[h.id]?.value ?? 0}/{h.target} {h.unit ?? ""}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-body">Current</div>
                      <div className="font-display text-xl font-bold text-ink">{h.streak}d</div>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-body">Best</div>
                      <div className="font-display text-xl font-bold text-ink">{h.best ?? h.streak}d</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-body">
                      <CalendarDays className="h-3.5 w-3.5" /> Last 30 days
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 30 }).map((_, i) => {
                        const dayOffset = 29 - i;
                        const d = new Date(todayDate);
                        d.setDate(d.getDate() - dayOffset);
                        const isFuture = d > todayDate;
                        const dk = formatDateKey(d);
                        const entry = completionsMap[dk]?.[h.id];
                        const done = Boolean(entry && (entry.done || entry.restDay || entry.frozenStreak));
                        const restDay = Boolean(entry?.restDay);
                        const frozen = Boolean(entry?.frozenStreak);
                        return (
                          <div
                            key={i}
                            title={`${dk}: ${done ? (restDay ? "Rest day" : frozen ? "Streak frozen" : "Completed") : "Missed"}`}
                            className={`aspect-square rounded-md text-[9px] font-semibold grid place-items-center ${
                              isFuture
                                ? "bg-canvas-soft/50 text-mute"
                                : done
                                  ? restDay
                                    ? "bg-sky-500/25 text-sky-200 border border-sky-400/30"
                                    : frozen
                                      ? "bg-amber-500/25 text-amber-200 border border-amber-400/30"
                                      : "bg-emerald-500/25 text-emerald-200 border border-emerald-400/30"
                                  : "bg-rose-500/15 text-rose-300/80 border border-rose-400/20"
                            }`}
                          >
                            {d.getDate()}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[10px] text-mute">Today shown in real-time · historical data via heatmap</p>
                  </div>

                  <Field label="Daily note">
                    <input
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="How did it go today?"
                      className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => freezeStreak(detail.q, detail.i)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas-soft px-4 py-3 text-xs font-semibold text-ink hover:bg-[color:var(--surface-pressed)]"
                    >
                      <Snowflake className="h-3.5 w-3.5" /> Freeze today
                    </button>
                    <button
                      onClick={async () => {
                        // Persist note to Firestore first
                        if (noteDraft.trim()) {
                          await saveHabitNote(h.id, noteDraft.trim());
                        }
                        if (!h.done) await toggleHabitDone(h.id);
                        showToast(noteDraft.trim() ? "Note saved & marked done" : "Marked done");
                        setDetail(null);
                      }}
                      className="btn-primary-uber py-3 text-xs"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </SheetShell>
            );
          })()}
        </div>
      </div>
    </main>
  );
}

function SheetShell({
  onClose,
  title,
  subtitle,
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const hapticFired = useRef(false);

  const DISMISS_THRESHOLD = 90;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
    hapticFired.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const deltaY = e.clientY - startY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
      if (deltaY >= DISMISS_THRESHOLD && !hapticFired.current) {
        hapticFired.current = true;
        try { navigator.vibrate?.(18); } catch {}
      }
    } else {
      setDragY(deltaY * 0.2);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}

    if (dragY >= DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
    startY.current = null;
    hapticFired.current = false;
  };

  const backdropOpacity = Math.max(0.1, 1 - Math.min(0.75, dragY / 300));

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
      style={{ opacity: backdropOpacity }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate3d(0, ${Math.max(0, dragY)}px, 0)`,
          transition: isDragging ? "none" : "transform 250ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
        className="w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-canvas p-5 select-none"
      >
        {/* Drag Handle & Header Drag Area */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="group cursor-grab active:cursor-grabbing touch-none pb-2"
        >
          <div
            className={`mx-auto mb-3 h-1.5 rounded-full transition-all duration-200 ${
              dragY >= DISMISS_THRESHOLD
                ? "w-20 bg-rose-500"
                : isDragging
                ? "w-16 bg-ink"
                : "w-12 bg-[color:var(--surface-pressed)] group-hover:bg-[color:var(--hairline-mid)]"
            }`}
          />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
              {subtitle && <p className="text-xs text-body">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}


function Row({ label, action }: { label: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-canvas-soft px-4 py-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      {action}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-lg-press
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ink/30 ${
        checked
          ? "bg-ink border-ink"
          : "bg-canvas border-[color:var(--hairline)]"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full shadow-sm transition-all duration-200 ${
          checked
            ? "translate-x-[22px] bg-on-ink"
            : "translate-x-[3px] bg-ink"
        }`}
      />
    </button>
  );
}

function ConfirmDialog({
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
}: {
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass specular relative w-full max-w-[320px] overflow-hidden rounded-3xl p-6 text-center"
      >
        {icon && (
          <div
            className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl ${
              destructive
                ? "bg-red-500/10 text-red-500 border border-red-500/25"
                : "bg-canvas-soft text-ink border border-[color:var(--hairline)]"
            }`}
          >
            {icon}
          </div>
        )}
        <h4 id="confirm-title" className="font-display text-lg font-bold text-ink">
          {title}
        </h4>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-body">{description}</p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            data-lg-press
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`pill w-full py-3 text-[14px] font-semibold transition ${
              destructive
                ? "bg-red-500 text-white hover:bg-red-500/90"
                : "bg-ink text-on-ink"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            data-lg-press
            onClick={onClose}
            className="pill w-full border border-[color:var(--hairline)] bg-canvas-soft py-3 text-[14px] font-semibold text-ink"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-body">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, pulseKey }: { label: string; value: string; pulseKey?: number | string }) {
  return (
    <div className="text-center">
      <div
        key={pulseKey ?? label}
        className="font-display text-lg font-bold tabular-nums text-ink animate-pop-badge"
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-body">{label}</div>
    </div>
  );
}

function QuadrantCard({
  q,
  habits,
  timeFilter,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  q: Quadrant;
  habits: Habit[];
  timeFilter: "all" | "morning" | "afternoon" | "evening";
  onToggle: (i: number) => void;
  onRest: (i: number) => void;
  onPin: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number) => void;
  onEdit: (i: number) => void;
  onAdjust: (i: number, dir: 1 | -1) => void;
  onOpenDetail: (i: number) => void;
}) {
  const meta = QUADRANTS[q];
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [justDone, setJustDone] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleToggle = (i: number) => {
    const wasDone = habits[i].done;
    onToggle(i);
    if (!wasDone) {
      setJustDone(i);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setJustDone(null), 500);
    }
  };

  const visible = habits
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => timeFilter === "all" || h.time === timeFilter);

  const doneCount = visible.filter(({ h }) => h.done).length;

  return (
    <div className="card-soft relative flex w-full flex-col overflow-hidden border border-[color:var(--hairline)] transition-all">
      {/* Header bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-3 text-left transition hover:bg-[color:var(--canvas-softer)] active:scale-[0.995]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <h3 className="font-display text-sm font-bold text-ink">{meta.title}</h3>
          <span className="text-[10px] font-medium tracking-wider text-mute">
            · {meta.sub}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium tabular-nums text-mute">
            {doneCount}/{visible.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-mute transition-transform duration-200 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </div>
      </button>

      {/* Content Area */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-0 space-y-1.5">
          {visible.map(({ h, i }) => (
            <HabitRow
              key={`${h.name}-${i}`}
              habit={h}
              justDone={justDone === i}
              menuOpen={openMenu === i}
              onMenuToggle={() => setOpenMenu(openMenu === i ? null : i)}
              onMenuClose={() => setOpenMenu(null)}
              onToggle={() => handleToggle(i)}
              onRest={() => onRest(i)}
              onPin={() => onPin(i)}
              onDelete={() => onDelete(i)}
              onMove={() => onMove(i)}
              onEdit={() => onEdit(i)}
              onAdjust={(dir) => onAdjust(i, dir)}
              onOpenDetail={() => onOpenDetail(i)}
            />
          ))}
          {visible.length === 0 && (
            <div className="py-2.5 text-center text-[11px] font-medium text-mute">
              No habits scheduled
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Habit Row (swipe-to-complete / rest) ----------------
function HabitRow({
  habit: h,
  justDone,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  habit: Habit;
  justDone: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onToggle: () => void;
  onRest: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMove: () => void;
  onEdit: () => void;
  onAdjust: (dir: 1 | -1) => void;
  onOpenDetail: () => void;
}) {
  const isNumeric = h.target !== undefined;
  const pct = isNumeric ? Math.min(100, ((h.value ?? 0) / (h.target ?? 1)) * 100) : 0;

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const axisLocked = useRef<"x" | "y" | null>(null);
  const threshHit = useRef(false);
  const COMMIT = 88;
  const HAPTIC_AT = 60;

  const rubberband = (v: number) => {
    const abs = Math.abs(v);
    if (abs <= COMMIT) return v;
    const over = abs - COMMIT;
    const damped = COMMIT + over * (1 - over / (over + 140));
    return v < 0 ? -damped : damped;
  };

  const onDown = (e: React.PointerEvent) => {
    if (isNumeric) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    threshHit.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMoveP = (e: React.PointerEvent) => {
    if (isNumeric || startX.current === null || startY.current === null) return;
    const rawX = e.clientX - startX.current;
    const rawY = e.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(rawX) < 6 && Math.abs(rawY) < 6) return;
      axisLocked.current = Math.abs(rawX) > Math.abs(rawY) ? "x" : "y";
    }
    if (axisLocked.current !== "x") return;
    if (!dragging) setDragging(true);
    const val = rubberband(rawX);
    setDx(val);
    if (!threshHit.current && Math.abs(val) >= HAPTIC_AT) {
      threshHit.current = true;
      try { navigator.vibrate?.(18); } catch {}
    }
    if (threshHit.current && Math.abs(val) < HAPTIC_AT - 12) {
      threshHit.current = false;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (isNumeric) return;
    const wasDrag = axisLocked.current === "x" && Math.abs(dx) > 6;
    if (dx >= COMMIT) {
      if (!h.done) onToggle();
    } else if (dx <= -COMMIT) {
      onRest();
    }
    setDx(0);
    setDragging(false);
    startX.current = null;
    startY.current = null;
    axisLocked.current = null;
    if (wasDrag) {
      // suppress click after drag
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const swipeProgress = Math.min(1, Math.abs(dx) / COMMIT);
  const rightRevealed = dx > 4;
  const leftRevealed = dx < -4;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-canvas ${
        h.done ? "opacity-70" : ""
      } ${justDone ? "animate-sync-pulse" : ""}`}
    >
      {/* Swipe reveal backgrounds */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 rounded-l-xl pl-2 pr-2 text-[10px] font-semibold text-emerald-300 transition-opacity"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.15 155) 22%, transparent)",
          opacity: rightRevealed ? 0.4 + swipeProgress * 0.6 : 0,
          width: Math.max(0, dx) + 8,
        }}
      >
        <Check
          className="h-3.5 w-3.5"
          strokeWidth={3}
          style={{ transform: `scale(${0.85 + swipeProgress * 0.4})` }}
        />
        <span>{swipeProgress >= 1 ? "Release" : "Done"}</span>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end gap-1 rounded-r-xl pl-2 pr-2 text-[10px] font-semibold text-sky-300 transition-opacity"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.13 235) 22%, transparent)",
          opacity: leftRevealed ? 0.4 + swipeProgress * 0.6 : 0,
          width: Math.max(0, -dx) + 8,
        }}
      >
        <span>{swipeProgress >= 1 ? "Release" : "Rest"}</span>
        <Shield
          className="h-3.5 w-3.5"
          style={{ transform: `scale(${0.85 + swipeProgress * 0.4})` }}
        />
      </div>

      {/* Static hover hints when idle */}
      {!dragging && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center gap-1 rounded-l-xl bg-emerald-500/15 pl-1.5 pr-2 text-[9px] font-semibold text-emerald-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <Check className="h-3 w-3" strokeWidth={3} />
            <span>Swipe →</span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1 rounded-r-xl bg-sky-500/15 pl-2 pr-1.5 text-[9px] font-semibold text-sky-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <span>← Rest</span>
            <Shield className="h-3 w-3" />
          </div>
        </>
      )}

      <div
        onPointerDown={onDown}
        onPointerMove={onMoveP}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => {
          if (Math.abs(dx) > 6) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onOpenDetail();
        }}
        style={{
          transform: `translate3d(${dx}px,0,0)`,
          transition: dragging ? "none" : "transform 260ms cubic-bezier(.2,.9,.3,1.2)",
          touchAction: "pan-y",
        }}
        className="relative flex cursor-pointer items-center gap-2 bg-canvas p-2 transition-[background] hover:bg-[color:var(--canvas-softer)]"
      >
        {isNumeric ? (
          <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[color:var(--hairline-mid)] text-ink">
            <Droplets className="h-3 w-3" />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
              h.done
                ? "border-ink bg-ink text-on-ink"
                : "border-[color:var(--hairline-mid)] hover:border-ink"
            }`}
            aria-label={h.done ? `Undo ${h.name}` : `Mark ${h.name} done`}
          >
            {h.done && <Check className="h-3 w-3 animate-scale-in" strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[11px] font-semibold leading-tight text-ink ${
              h.done && !isNumeric ? "line-through" : ""
            }`}
          >
            {h.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className={`rounded-full px-1.5 py-px text-[8px] font-semibold ${catClass(h.category)}`}>
              {h.category}
            </span>
            {h.streak > 0 && (
              <span
                key={h.streak}
                className="flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-px text-[8px] font-semibold text-on-ink animate-pop-badge"
              >
                {h.streak}d
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`grid h-6 w-6 place-items-center rounded-md transition ${
              h.pinned ? "text-ink" : "text-mute hover:text-ink"
            }`}
            aria-label="Pin to wallpaper"
          >
            <Pin className="h-3 w-3" fill={h.pinned ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-mute hover:text-ink"
            aria-label="More"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isNumeric && (
        <div
          className="relative bg-canvas px-2 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between text-[9px] font-medium text-body">
            <span className="tabular-nums">
              <span className="text-ink font-semibold">{(h.value ?? 0).toFixed(1)}</span>
              {" / "}
              {(h.target ?? 0).toFixed(1)} {h.unit}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAdjust(-1)}
                className="grid h-5 w-5 place-items-center rounded-full bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                aria-label="Decrease"
              >
                <Minus className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
              <button
                onClick={() => onAdjust(1)}
                className="grid h-5 w-5 place-items-center rounded-full bg-ink text-on-ink hover:opacity-90"
                aria-label="Increase"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
            </div>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-canvas-soft">
            <div
              className="h-full rounded-full bg-emerald-400/80 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="absolute right-1 top-8 z-10 w-28 overflow-hidden rounded-lg border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Settings className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRest(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Shield className="h-3 w-3" /> Rest day
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Sparkles className="h-3 w-3" /> Move
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-red-500 hover:bg-canvas-soft"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}


// ---------------- Today Hero ----------------
interface TodayHeroProps {
  streak: number;
  rate: number;
  done: number;
  total: number;
  nextHabit: { q: Quadrant; i: number; habit: Habit } | null;
  onCompleteNext: (q: Quadrant, i: number) => void;
}

function TodayHero({ streak, rate, done, total, nextHabit, onCompleteNext }: TodayHeroProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const R = 32;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  return (
    <section className="relative px-5 pt-4">
      <div className="card-invert relative overflow-hidden rounded-[28px]">
        {/* Specular top edge already provided by card-invert::before */}
        <div className="relative flex items-start justify-between px-6 pt-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">
              Current streak
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                key={streak}
                className="font-display animate-pop-badge text-[64px] font-bold leading-none tracking-tight tabular-nums"
              >
                {streak}
              </span>
              <span className="font-display text-xl font-medium opacity-40">
                {streak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="opacity-10"
              />
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-sm font-bold tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="mx-6 mt-5 h-px bg-[color:var(--on-ink)]/10" />

        {/* Next action row */}
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
              {total === 0 ? "Ready when you are" : nextHabit ? "Up next" : "All done"}
            </span>
            <p className="font-display truncate text-base font-semibold">
              {total === 0 ? "Add your first habit" : nextHabit ? nextHabit.habit.name : "You cleared today"}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums opacity-60">
              {total === 0 ? "No habits tracked yet" : `${done}/${total} completed · ${rate}%`}
            </p>
          </div>
          {nextHabit && (
            <button
              onClick={() => onCompleteNext(nextHabit.q, nextHabit.i)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--on-ink)] text-ink shadow-[0_6px_16px_-4px_rgba(0,0,0,0.35)] transition active:scale-95"
              aria-label={`Complete ${nextHabit.habit.name}`}
              data-lg-press
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}


// ---------------- Profile Edit Sheet ----------------
function ProfileEditSheet({
  profile,
  onClose,
  onSave,
}: {
  profile: { name: string; tagline: string; initials: string };
  onClose: () => void;
  onSave: (next: { name: string; tagline: string; initials: string }) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline);
  const [initials, setInitials] = useState(profile.initials);
  const [initialsTouched, setInitialsTouched] = useState(false);

  const derivedInitials = (name || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const effectiveInitials = (initialsTouched ? initials : derivedInitials).slice(0, 2).toUpperCase() || "U";

  return (
    <SheetShell onClose={onClose} title="Edit profile" subtitle="Update how you show up in the app">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink font-display text-lg font-bold">
            {effectiveInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{name || "Your name"}</p>
            <p className="truncate text-[11px] text-body">{tagline || "Your tagline"}</p>
          </div>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Tagline">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short line about you"
            maxLength={80}
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Avatar initials (1–2 letters)">
          <input
            value={initialsTouched ? initials : derivedInitials}
            onChange={(e) => {
              setInitialsTouched(true);
              setInitials(e.target.value.slice(0, 2));
            }}
            placeholder="e.g. JD"
            maxLength={2}
            className="w-32 rounded-2xl bg-canvas-soft px-4 py-3 text-sm uppercase tracking-wider text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            data-lg-press
            onClick={onClose}
            className="pill w-full border border-[color:var(--hairline)] bg-canvas-soft py-3 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            data-lg-press
            onClick={() =>
              onSave({
                name: name.trim() || "You",
                tagline: tagline.trim() || profile.tagline,
                initials: effectiveInitials,
              })
            }
            className="btn-primary-uber w-full py-3 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </SheetShell>
  );
}

// ---------------- Edit Habit Sheet ----------------
function EditHabitSheet({
  habit,
  quadrant,
  onClose,
  onSave,
  onDelete,
}: {
  habit: Habit;
  quadrant: Quadrant;
  onClose: () => void;
  onSave: (patch: Partial<Habit>, newQ?: Quadrant) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [category, setCategory] = useState(habit.category);
  const [q, setQ] = useState<Quadrant>(quadrant);
  const [time, setTime] = useState<Habit["time"] | undefined>(habit.time);
  const [isNumeric, setIsNumeric] = useState(habit.target !== undefined);
  const [target, setTarget] = useState<number>(habit.target ?? 1);
  const [unit, setUnit] = useState<string>(habit.unit ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const CATS = ["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];
  const TIMES: Array<{ key: NonNullable<Habit["time"]> | "any"; label: string }> = [
    { key: "any", label: "Anytime" },
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
  ];

  return (
    <>
      <SheetShell onClose={onClose} title="Edit habit" subtitle={habit.name}>
        <div className="space-y-4">
          <Field label="Habit name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
            />
          </Field>

          <Field label="Category">
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                      active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Priority quadrant">
            <div className="grid grid-cols-2 gap-2">
              {QUADRANT_ORDER.map((qq) => {
                const active = q === qq;
                return (
                  <button
                    key={qq}
                    onClick={() => setQ(qq)}
                    className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${
                      active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                    }`}
                  >
                    {QUADRANTS[qq].title}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Time of day">
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => {
                const active = (time ?? "any") === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTime(t.key === "any" ? undefined : (t.key as Habit["time"]))}
                    className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                      active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsNumeric(false)}
                className={`pill px-3 py-2.5 text-xs font-medium transition ${!isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
              >
                Binary
              </button>
              <button
                onClick={() => setIsNumeric(true)}
                className={`pill px-3 py-2.5 text-xs font-medium transition ${isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
              >
                Numeric
              </button>
            </div>
          </Field>

          {isNumeric && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Target">
                <input
                  type="number"
                  value={target}
                  min={0}
                  step="0.25"
                  onChange={(e) => setTarget(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none focus:bg-[color:var(--canvas-softer)]"
                />
              </Field>
              <Field label="Unit">
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="glasses, km…"
                  className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              data-lg-press
              onClick={() => setConfirmDelete(true)}
              className="pill w-full border border-red-500/30 bg-red-500/5 py-3 text-sm font-semibold text-red-500"
            >
              <Trash2 className="mr-1.5 inline h-3.5 w-3.5" /> Delete
            </button>
            <button
              data-lg-press
              onClick={() => {
                const patch: Partial<Habit> = {
                  name: name.trim() || habit.name,
                  category,
                  time,
                };
                if (isNumeric) {
                  patch.target = target;
                  patch.unit = unit;
                  patch.step = habit.step ?? 0.25;
                  patch.value = habit.value ?? 0;
                } else {
                  patch.target = undefined;
                  patch.unit = undefined;
                  patch.value = undefined;
                }
                onSave(patch, q);
              }}
              className="btn-primary-uber w-full py-3 text-sm"
            >
              Save changes
            </button>
          </div>
        </div>
      </SheetShell>
      {confirmDelete && (
        <ConfirmDialog
          onClose={() => setConfirmDelete(false)}
          onConfirm={onDelete}
          title="Delete habit?"
          description={`"${habit.name}" will be removed. You can undo from the snackbar.`}
          confirmLabel="Delete"
          destructive
          icon={<Trash2 className="h-5 w-5" />}
        />
      )}
    </>
  );
}
