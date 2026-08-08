const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'src/routes/index.tsx');
let content = fs.readFileSync(indexFile, 'utf-8');

// The Dashboard code starts from `type AppTab = ...`
const dashboardStart = content.indexOf('type AppTab = "today" | "consistency" | "myday" | "wallpaper" | "goal";');

if (dashboardStart === -1) {
  console.log("Could not find dashboard start");
  process.exit(1);
}

// We need to gather all imports from index.tsx and put them in Dashboard.tsx
// All imports are at the top, until `const catClass`
const importsEnd = content.indexOf('const catClass =');
const importsCode = content.slice(0, importsEnd);

// Replace Grain with Dashboard in the extracted code
const dashboardCode = content.slice(dashboardStart).replace('function Grain({ user }:', 'export function Dashboard({ user }:');

// Create Dashboard.tsx
const dashboardFile = path.join(__dirname, 'src/components/Dashboard.tsx');
fs.writeFileSync(dashboardFile, importsCode + dashboardCode);

// Create new index.tsx
const newIndex = `import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "../components/auth/AuthGate";
import { Dashboard } from "../components/Dashboard";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate>
      {(user) => <Dashboard user={user} />}
    </AuthGate>
  ),
});
`;

fs.writeFileSync(indexFile, newIndex);
console.log("Dashboard extraction complete!");
