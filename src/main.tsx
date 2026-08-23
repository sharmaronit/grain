import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./components/auth/AuthGate";
import { Dashboard } from "./components/Dashboard";
import "./styles.css";

import { SafeArea } from "capacitor-plugin-safe-area";

const queryClient = new QueryClient();

// Fetch safe area insets and inject into CSS
SafeArea.getSafeAreaInsets().then(({ insets }) => {
  document.documentElement.style.setProperty("--sa-top", `${insets.top}px`);
  document.documentElement.style.setProperty("--sa-bottom", `${insets.bottom}px`);
}).catch(e => console.error("SafeArea error:", e));

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          {(user) => <Dashboard key={user.uid} user={user} />}
        </AuthGate>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
