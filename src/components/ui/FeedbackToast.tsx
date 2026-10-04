import { X } from "lucide-react";

export function FeedbackToast({
  notice,
  onDismiss,
}: {
  notice: { id: string; message: string; action?: { label: string; onClick: () => void } };
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="status"
      className="settings-glass fixed bottom-[calc(var(--sa-bottom,0px)+94px)] left-1/2 z-[200] flex w-[calc(100%-32px)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 text-xs text-ink shadow-lg"
    >
      <span className="min-w-0 flex-1">{notice.message}</span>
      {notice.action && (
        <button
          type="button"
          className="shrink-0 font-semibold underline underline-offset-4"
          onClick={() => {
            notice.action?.onClick();
            onDismiss(notice.id);
          }}
        >
          {notice.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss message"
        className="shrink-0 p-1"
        onClick={() => onDismiss(notice.id)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
