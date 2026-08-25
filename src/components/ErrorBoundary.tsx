import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6 shadow-xl border border-white/15">
            <span className="text-2xl">🌱</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Something unexpected happened</h2>
          <p className="text-sm text-neutral-400 max-w-sm mb-8">
            Grain recovered safely from an unexpected state. Tap below to resume.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="h-12 px-8 rounded-full bg-white text-black font-bold text-sm tracking-wider uppercase active:scale-95 transition-all shadow-lg hover:bg-neutral-200"
          >
            Restart Grain
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
