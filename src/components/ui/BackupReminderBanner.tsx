import { Download, ShieldCheck, X } from "lucide-react";

interface BackupReminderBannerProps {
  onBackup: () => void;
  onLater: () => void;
}

export function BackupReminderBanner({ onBackup, onLater }: BackupReminderBannerProps) {
  return (
    <aside className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-surface-strong)] px-3.5 py-3 shadow-lg backdrop-blur-xl" role="status">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
        <ShieldCheck className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink">Protect your progress</p>
        <p className="mt-0.5 text-[10px] leading-snug text-body">Your data lives on this device. Save a backup before changing phones or uninstalling.</p>
      </div>
      <button type="button" onClick={onBackup} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 text-[10px] font-bold text-on-ink active:scale-95">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Back up
      </button>
      <button type="button" onClick={onLater} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-ink/8 hover:text-ink" aria-label="Remind me later">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </aside>
  );
}
