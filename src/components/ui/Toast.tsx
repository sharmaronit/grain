import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  const value = {
    toast: addToast,
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center gap-2 p-4 pt-12 sm:pt-4">
          {toasts.map((t) => (
            <ToastBanner key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastBanner({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger slide down animation
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const bgColors = {
    success: "bg-green-500/90 border-green-500/20 text-white",
    error: "bg-red-500/90 border-red-500/20 text-white",
    info: "bg-black/80 dark:bg-white/90 border-white/10 dark:border-black/10 text-white dark:text-black"
  };

  return (
    <div
      onClick={onDismiss}
      className={`pointer-events-auto cursor-pointer backdrop-blur-xl border shadow-xl rounded-full px-5 py-3 text-sm font-medium transition-all duration-400 ease-out flex items-center gap-3 max-w-[90vw] sm:max-w-md ${bgColors[toast.type]} ${
        mounted ? "translate-y-0 opacity-100 scale-100" : "-translate-y-8 opacity-0 scale-95"
      }`}
    >
      {toast.type === "success" && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {toast.type === "error" && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.type === "info" && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="truncate">{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
