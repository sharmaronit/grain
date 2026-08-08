const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'src/routes/index.tsx');
let content = fs.readFileSync(indexFile, 'utf-8');

// Find start of AuthStage type
const startMatch = content.indexOf('type AuthStage = "login" | "onboarding" | "app";');
// Find end of OnboardingScreen
const endMatchString = '  );\n}\n';
const afterOnboarding = content.indexOf('type AppTab = "today" | "consistency" | "myday" | "wallpaper" | "goal";');
const endMatch = content.lastIndexOf(endMatchString, afterOnboarding) + endMatchString.length;

if (startMatch === -1 || afterOnboarding === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

const authCode = content.slice(startMatch, endMatch);
content = content.slice(0, startMatch) + '\n' + content.slice(endMatch);

// We also need to modify AuthGate to accept children instead of importing Grain
let modifiedAuthCode = authCode
  .replace('export default function App() {\n', 'function App() {\n')
  .replace(/export function AuthGate\(\) \{[\s\S]*?return <Grain user=\{user\} \/>;\n\}/g, `export function AuthGate({ children }: { children: (user: any) => React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PhoneShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink" />
        </div>
      </PhoneShell>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children(user)}</>;
}`);

const imports = `import React, { useState } from "react";
import { Loader2, ArrowRight, AlertCircle, Check, Sparkles, Flame, CalendarDays, Wallpaper } from "lucide-react";
import { useAuth, signInEmail, signUpEmail, signInGoogle, resetPassword, friendlyError } from "../../lib/auth";
import { HABIT_PACKS } from "../../lib/templates";

`;

fs.mkdirSync(path.join(__dirname, 'src/components/auth'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'src/components/auth/AuthGate.tsx'), imports + modifiedAuthCode);

// update index.tsx
content = content.replace(
  'export const Route = createFileRoute("/")({\n  component: AuthGate,\n});',
  `import { AuthGate } from "../components/auth/AuthGate";\n\nexport const Route = createFileRoute("/")({\n  component: () => (\n    <AuthGate>\n      {(user) => <Grain user={user} />}\n    </AuthGate>\n  ),\n});`
);

fs.writeFileSync(indexFile, content);
console.log("Extraction complete!");
