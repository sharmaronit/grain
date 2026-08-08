import React, { useState } from "react";
import { Loader2, ArrowRight, AlertCircle, Check, Sparkles, Flame, CalendarDays, Wallpaper } from "lucide-react";
import { useAuth, signInEmail, signUpEmail, signInGoogle, resetPassword, friendlyError } from "../../lib/auth";
import { HABIT_PACKS } from "../../lib/templates";

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
    } catch { }
  },
  clear(key: string) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch { }
  },
};



export function AuthGate({ children }: { children: (user: any) => React.ReactNode }) {
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

  return <>{children(user)}</>;
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full justify-center bg-canvas overflow-hidden">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-canvas pt-safe pb-safe">
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
      try { navigator.vibrate?.(14); } catch { }
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
      try { navigator.vibrate?.(14); } catch { }
      setLoading("signup");
      try {
        await signUpEmail(email.trim(), password, name.trim());
      } catch (err) {
        setFormError(friendlyError(err));
        try { navigator.vibrate?.([20, 40, 20]); } catch { }
      } finally {
        setLoading(null);
      }
      return;
    }

    try { navigator.vibrate?.(14); } catch { }
    setLoading("email");
    try {
      await signInEmail(email.trim(), password);
    } catch (err) {
      setFormError(friendlyError(err));
      try { navigator.vibrate?.([20, 40, 20]); } catch { }
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
      try { navigator.vibrate?.([20, 40, 20]); } catch { }
    } finally {
      setLoading(null);
    }
  };

  const inputCls = (invalid: boolean) =>
    `w-full rounded-2xl bg-white/5 backdrop-blur-[32px] border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] px-4 py-3 text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:bg-white/10 transition disabled:opacity-60 ${invalid ? "border-red-500/60 focus:border-red-500/80" : "border-white/10 focus:border-white/30"
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
          <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-2xl bg-white/10 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden">
            <img src="/icon.png" alt="Grain Logo" className="h-full w-full object-cover mix-blend-screen opacity-90 drop-shadow-md scale-[1.5]" />
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
              className="mt-5 sm:mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-semibold text-white hover:bg-white/10 transition disabled:opacity-70"
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
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-[40px] border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.25)] py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-bold text-white hover:bg-white/30 transition disabled:opacity-70"
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
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.4 13.4 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.6z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4-13.6-9.4l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function OnboardingScreen({ defaultName, onDone }: { defaultName: string; onDone: (name: string, selectedPackId?: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [selectedPack, setSelectedPack] = useState<string>("mindfulness");

  return (
    <PhoneShell>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lg-blob absolute -left-16 top-10 h-56 w-56 rounded-full" />
        <div className="lg-blob absolute -right-20 bottom-32 h-64 w-64 rounded-full" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="relative flex h-full flex-col px-6 sm:px-7 pb-6 sm:pb-8 pt-10 sm:pt-14">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all"
              style={{ background: i <= step ? "var(--ink)" : "var(--hairline)" }}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="mt-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-canvas-soft">
              <Sparkles className="h-6 w-6 text-ink" />
            </div>
            <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.1] text-ink">
              Welcome to Grain
            </h1>
            <p className="mt-2.5 text-[12px] text-body leading-relaxed">
              A quiet, monochrome habit tracker with Eisenhower priorities and lockscreen heatmaps.
            </p>
            <ul className="mt-6 space-y-3 text-[12px] text-ink">
              <li className="flex items-start gap-3">
                <Flame className="mt-0.5 h-4 w-4" /> Daily streaks & rest days
              </li>
              <li className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4" /> 52-week consistency heatmap
              </li>
              <li className="flex items-start gap-3">
                <Wallpaper className="mt-0.5 h-4 w-4" /> Lockscreen wallpaper preview
              </li>
            </ul>
          </div>
        ) : step === 1 ? (
          <div className="mt-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-canvas-soft">
              <span className="font-display text-lg font-bold text-ink">
                {(name || "?").slice(0, 1).toUpperCase()}
              </span>
            </div>
            <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.1] text-ink">
              What should we call you?
            </h1>
            <p className="mt-2 text-[12px] text-body leading-relaxed">
              This shows up in your profile. You can change it later.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-5 w-full rounded-2xl border border-[color:var(--hairline)] bg-canvas-soft px-4 py-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-ink/30"
            />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold leading-[1.1] text-ink">
                Choose your starter pack
              </h1>
              <p className="mt-1 text-[12px] text-body">
                Pick a 1-click habit template to jumpstart your streak.
              </p>
            </div>

            <div className="space-y-2.5">
              {HABIT_PACKS.map((pack) => {
                const active = selectedPack === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPack(pack.id)}
                    className={`flex w-full items-start gap-3.5 rounded-2xl border p-3.5 text-left transition ${active
                      ? "border-ink bg-ink text-on-ink"
                      : "border-[color:var(--hairline)] bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                      }`}
                  >
                    <span className="text-2xl">{pack.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-bold">{pack.name}</div>
                      <div className={`mt-0.5 text-[11px] ${active ? "opacity-80" : "text-body"}`}>
                        {pack.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              data-lg-press
              className="pill border border-[color:var(--hairline)] bg-canvas-soft px-5 py-3 text-[13px] font-semibold text-ink"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              try { navigator.vibrate?.(12); } catch { }
              if (step < 2) setStep(step + 1);
              else onDone(name.trim() || "You", selectedPack);
            }}
            data-lg-press
            className="pill flex flex-1 items-center justify-center gap-2 bg-ink py-3 text-[14px] font-semibold text-on-ink"
          >
            {step < 2 ? "Continue" : "Start Grain"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
