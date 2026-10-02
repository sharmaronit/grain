import { AlertCircle, RefreshCw } from "lucide-react";

interface DataStatusBannerProps {
  message: string;
  onRetry: () => void;
  recoveryAction?: { label: string; onClick: () => void };
}

export function DataStatusBanner({ message, onRetry, recoveryAction }: DataStatusBannerProps) {
  return (
    <div className="data-status-banner" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {recoveryAction && (
        <button type="button" onClick={recoveryAction.onClick} className="data-status-banner__retry">
          {recoveryAction.label}
        </button>
      )}
      <button type="button" onClick={onRetry} className="data-status-banner__retry">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Retry
      </button>
    </div>
  );
}
