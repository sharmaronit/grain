/**
 * Standalone SPA entry point for Capacitor / Android WebView.
 *
 * This file intentionally avoids TanStack Start / Nitro SSR entirely.
 * It renders the AuthGate (the full app UI) directly into #root using
 * plain React 19 + ReactDOM, with only the QueryClientProvider needed
 * by the Grain UI component tree.
 *
 * No server-side rendering, no router hydration, no SSR manifests.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./components/auth/AuthGate";
import { Dashboard } from "./components/Dashboard";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          {(user) => <Dashboard key={user.uid} user={user} />}
        </AuthGate>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
