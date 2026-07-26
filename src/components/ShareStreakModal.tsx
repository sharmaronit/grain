import React from "react";
import { SheetShell } from "./SheetShell";
import { Share2, Copy, Check, Flame, Trophy } from "lucide-react";

export function ShareStreakModal({
  onClose,
  userName,
  currentStreak,
  bestStreak,
  totalCompletions,
  rate,
  onShowToast,
}: {
  onClose: () => void;
  userName: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  rate: number;
  onShowToast: (msg: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const shareText = `🔥 I'm on a ${currentStreak}-day streak on Grain! Building 1% better habits daily. Check out Grain habit tracker.`;

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      onShowToast("Streak summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast("Could not copy link");
    }
  };

  return (
    <SheetShell
      onClose={onClose}
      title="Share Your Streak"
      subtitle="Social accountability builds unshakeable consistency."
    >
      <div className="mt-4 space-y-4">
        {/* Shareable Card Preview */}
        <div className="card-invert relative overflow-hidden rounded-[28px] p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--on-ink)] text-ink">
            <Flame className="h-6 w-6" />
          </div>
          <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">
            {userName}'s Grain Streak
          </div>
          <div className="mt-1 font-display text-[56px] font-bold leading-none tabular-nums">
            {currentStreak} <span className="text-xl font-medium opacity-50">days</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[color:var(--on-ink)]/10 pt-4 text-left">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">
                Best Streak
              </span>
              <div className="font-display text-base font-bold">{bestStreak} days</div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">
                Today's Rate
              </span>
              <div className="font-display text-base font-bold">{rate}%</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyShareText}
            className="flex flex-1 items-center justify-center gap-2 pill border border-[color:var(--hairline)] bg-canvas-soft py-3 text-xs font-semibold text-ink"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Summary"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `${userName}'s Grain Streak`,
                    text: shareText,
                  });
                } catch {}
              } else {
                copyShareText();
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 pill bg-ink py-3 text-xs font-semibold text-on-ink"
          >
            <Share2 className="h-4 w-4" /> Share Link
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
