import { useEffect, useState } from "react";
import { Check, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { retryFailedWrites, useSyncStatus } from "../../lib/sync-status";

export function SyncStatusPill({ online }: { online: boolean }) {
  const { pending, failed, lastSyncedAt } = useSyncStatus();
  const [recentlySaved, setRecentlySaved] = useState(false);

  useEffect(() => {
    if (lastSyncedAt === null) return;
    setRecentlySaved(true);
    const timer = window.setTimeout(() => setRecentlySaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [lastSyncedAt]);

  if (online && pending === 0 && failed === 0 && !recentlySaved) return null;

  const content = !online
    ? { icon: <CloudOff size={13} />, label: pending > 0 ? `${pending} change${pending === 1 ? "" : "s"} pending` : "Offline" }
    : failed > 0
      ? { icon: <RefreshCw size={13} />, label: `${failed} failed · Retry` }
      : pending > 0
        ? { icon: <Loader2 size={13} className="animate-spin" />, label: `Syncing ${pending}` }
        : { icon: <Check size={13} />, label: "Saved" };

  return (
    <button
      type="button"
      onClick={failed > 0 && online ? retryFailedWrites : undefined}
      className={`sync-status-pill ${failed > 0 ? "sync-status-pill--failed" : ""}`}
      aria-live="polite"
    >
      {content.icon}
      <span>{content.label}</span>
    </button>
  );
}
