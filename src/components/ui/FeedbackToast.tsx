export function FeedbackToast({
  notice,
  onDismiss,
}: {
  notice: { id: string; message: string; type: "success" | "error" | "info"; durationMs: number; action?: { label: string; onClick: () => void } };
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role={notice.type === "error" ? "alert" : "status"}
      className="grain-text-notice fixed top-[calc(var(--sa-top,0px)+72px)] left-1/2 z-[200] w-[calc(100%-48px)] max-w-sm -translate-x-1/2 text-center text-sm font-medium text-ink"
      style={{ animationDuration: `${notice.durationMs}ms` }}
    >
      <span>{notice.message}</span>
      {notice.action && (
        <button
          type="button"
          className="ml-2 font-semibold underline underline-offset-4"
          onClick={() => {
            notice.action?.onClick();
            onDismiss(notice.id);
          }}
        >
          {notice.action.label}
        </button>
      )}
    </div>
  );
}
