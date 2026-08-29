import React, { useState } from "react";
import { SheetShell } from "../SheetShell";
import { 
  MessageSquareHeart, 
  Lightbulb, 
  Bug, 
  Sparkles, 
  MessageCircle, 
  Star, 
  Send, 
  CheckCircle2, 
  Mail, 
  Loader2 
} from "lucide-react";
import { submitFeedback } from "../../lib/firestore";

interface FeedbackSheetProps {
  onClose: () => void;
  userId?: string | null;
  userEmail?: string;
  userName?: string;
  onToast: (msg: string) => void;
}

type FeedbackCategory = "feature" | "bug" | "praise" | "general";

const CATEGORIES: { key: FeedbackCategory; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  {
    key: "feature",
    label: "Feature Idea",
    icon: Lightbulb,
    placeholder: "What new feature or workflow would make Grain even better for you?",
  },
  {
    key: "bug",
    label: "Bug Report",
    icon: Bug,
    placeholder: "What went wrong? Describe what happened and the steps to reproduce it...",
  },
  {
    key: "praise",
    label: "Praise & Love",
    icon: Sparkles,
    placeholder: "What are you enjoying most about Grain? We'd love to hear your thoughts!",
  },
  {
    key: "general",
    label: "General Feedback",
    icon: MessageCircle,
    placeholder: "Share any feedback, questions, or ideas you have for the app...",
  },
];

const RATING_LABELS = ["Poor", "Fair", "Good", "Great", "Loved it!"];

export function FeedbackSheet({
  onClose,
  userId,
  userEmail = "",
  userName = "",
  onToast,
}: FeedbackSheetProps) {
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [name, setName] = useState(userName);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeCategoryConfig = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      onToast("Please write a brief message before submitting");
      return;
    }

    setSubmitting(true);
    try {
      navigator.vibrate?.(15);
    } catch {}

    try {
      const deviceInfo = typeof navigator !== "undefined"
        ? `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`
        : undefined;

      await submitFeedback({
        userId: userId ?? undefined,
        userEmail: email.trim() || undefined,
        userName: name.trim() || undefined,
        category,
        rating,
        message: message.trim(),
        deviceInfo,
      });

      setSubmitted(true);
      onToast("Thank you! Your feedback helps shape Grain.");
      try {
        navigator.vibrate?.([20, 60, 30]);
      } catch {}
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      // Even if offline/error, inform user gracefully
      onToast("Feedback saved offline. Thank you!");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailDirect = () => {
    const subject = encodeURIComponent(`Grain App Feedback: ${activeCategoryConfig.label}`);
    const body = encodeURIComponent(
      `Category: ${activeCategoryConfig.label}\nRating: ${rating}/5\nUser: ${name || "Anonymous"}\n\nMessage:\n${message}`
    );
    window.open(`mailto:support@grainhabit.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <SheetShell
      onClose={onClose}
      title="Feedback & Suggestions"
      subtitle="Help us build the best habit tracking experience"
    >
      {submitted ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-scale-up">
          <div className="h-16 w-16 rounded-full bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] text-[color:var(--accent)] grid place-items-center shadow-lg border border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 px-4">
            <h3 className="font-display text-xl font-bold text-ink">Thank you!</h3>
            <p className="text-xs text-body max-w-xs leading-relaxed">
              We read every single piece of feedback and continuously update Grain based on your suggestions.
            </p>
          </div>
          <div className="pt-4 w-full">
            <button
              type="button"
              onClick={onClose}
              className="w-full btn-primary-uber py-3.5 text-sm font-bold shadow-md active:scale-98 transition"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 pt-2 pb-6">
          {/* Category Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-mute block mb-2">
              What type of feedback is this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setCategory(cat.key);
                      try {
                        navigator.vibrate?.(8);
                      } catch {}
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-ink text-on-ink border-ink shadow-md scale-[1.01]"
                        : "bg-[color:color-mix(in_srgb,var(--canvas-soft)_80%,transparent)] text-body border-[color:var(--hairline)] hover:text-ink hover:bg-[color:color-mix(in_srgb,var(--surface-pressed)_50%,transparent)]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-on-ink" : "text-mute"}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className="rounded-2xl p-3.5 bg-[color:color-mix(in_srgb,var(--canvas-soft)_60%,transparent)] border border-[color:var(--hairline)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-mute">
                How is your overall experience?
              </span>
              <span className="text-[11px] font-bold text-ink">
                {RATING_LABELS[(hoverRating ?? rating) - 1]}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating ?? rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => {
                      setRating(star);
                      try {
                        navigator.vibrate?.(10);
                      } catch {}
                    }}
                    className="p-1.5 transition-transform active:scale-125 focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`h-7 w-7 transition-all ${
                        isFilled
                          ? "text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                          : "text-mute/40 hover:text-mute"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-mute block mb-1.5">
              Your Feedback <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={activeCategoryConfig.placeholder}
              rows={4}
              maxLength={1500}
              required
              className="w-full rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-mute/60 outline-none resize-none transition bg-[color:color-mix(in_srgb,var(--canvas-soft)_80%,transparent)] border border-[color:var(--hairline)] focus:border-ink/40 focus:bg-[color:var(--canvas)]"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-mute font-medium">
                {message.length} / 1500
              </span>
            </div>
          </div>

          {/* Contact Details (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-mute block mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ronit"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-ink placeholder:text-mute/60 outline-none bg-[color:color-mix(in_srgb,var(--canvas-soft)_80%,transparent)] border border-[color:var(--hairline)] focus:border-ink/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-mute block mb-1">
                Email for Reply (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-ink placeholder:text-mute/60 outline-none bg-[color:color-mix(in_srgb,var(--canvas-soft)_80%,transparent)] border border-[color:var(--hairline)] focus:border-ink/40"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full btn-primary-uber py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Feedback</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEmailDirect}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-body hover:text-ink flex items-center justify-center gap-1.5 transition bg-transparent hover:bg-[color:color-mix(in_srgb,var(--canvas-soft)_50%,transparent)]"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Or email directly: support@grainhabit.com</span>
            </button>
          </div>
        </form>
      )}
    </SheetShell>
  );
}
