import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "../components/auth/AuthGate";
import { Dashboard } from "../components/Dashboard";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate>
      {(user) => <Dashboard user={user} />}
    </AuthGate>
  ),
});
