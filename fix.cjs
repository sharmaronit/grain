const fs = require('fs');
let code = fs.readFileSync('src/routes/index.tsx', 'utf8');

const phoneShellIndex = code.indexOf('function PhoneShell(');
const habitInterfaceEnd = code.indexOf('}\n\nconst QUADRANTS', code.indexOf('interface Habit {'));

if (phoneShellIndex > -1 && habitInterfaceEnd > -1) {
  code = code.substring(0, phoneShellIndex) + code.substring(habitInterfaceEnd + 2);
  
  const importToAdd = 'import { LoginScreen, OnboardingScreen, PhoneShell, LiquidLoadingOverlay } from \"../components/auth/AuthScreens\";\nimport type { Habit } from \"../components/types\";\n';
  code = code.replace('import { createFileRoute } from \"@tanstack/react-router\";\n', 'import { createFileRoute } from \"@tanstack/react-router\";\n' + importToAdd);
  
  fs.writeFileSync('src/routes/index.tsx', code);
  console.log('Successfully updated index.tsx');
} else {
  console.log('Failed to find bounds:', phoneShellIndex, habitInterfaceEnd);
}
