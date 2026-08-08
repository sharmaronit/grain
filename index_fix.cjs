const fs = require('fs');
let lines = fs.readFileSync('src/routes/index.tsx', 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex(l => l.startsWith('function PhoneShell('));
const endIdx = lines.findIndex(l => l.startsWith('interface Habit {'));

let habitEndIdx = endIdx;
while (habitEndIdx < lines.length && !lines[habitEndIdx].startsWith('}')) {
  habitEndIdx++;
}

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, habitEndIdx - startIdx + 1);
  
  lines.splice(1, 0, 'import { LoginScreen, OnboardingScreen, PhoneShell, LiquidLoadingOverlay } from \"../components/auth/AuthScreens\";');
  lines.splice(2, 0, 'import type { Habit } from \"../components/types\";');
  
  fs.writeFileSync('src/routes/index.tsx', lines.join('\r\n'));
  console.log('Success');
} else {
  console.log('Failed:', startIdx, endIdx);
}
