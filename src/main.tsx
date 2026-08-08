import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./components/auth/AuthGate";
import { Dashboard } from "./components/Dashboard";
import "./styles.css";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          {(user) => <Dashboard user={user} />}
        </AuthGate>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
