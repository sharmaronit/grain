const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');
if (!css.includes('.liquid-input')) {
  css += `\n.liquid-input {
  background: color-mix(in oklab, var(--canvas-soft) 40%, transparent) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid color-mix(in oklab, var(--ink) 12%, transparent);
  box-shadow: inset 0 1px 1px color-mix(in oklab, var(--ink) 4%, transparent), 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.liquid-input:hover {
  background: color-mix(in oklab, var(--canvas-soft) 60%, transparent) !important;
  border-color: color-mix(in oklab, var(--ink) 20%, transparent);
}\n`;
  fs.writeFileSync('src/styles.css', css);
}

let tsx = fs.readFileSync('src/routes/index.tsx', 'utf8');

// Find the Create habit SheetShell
const startStr = 'title="Create habit"';
const startIdx = tsx.indexOf(startStr);
const endIdx = tsx.indexOf('</SheetShell>', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  let section = tsx.substring(startIdx, endIdx);
  // Replace bg-canvas-soft with liquid-input
  section = section.replace(/bg-canvas-soft/g, 'liquid-input');
  
  // Also enhance the main "Create habit" button to look glassy
  section = section.replace(
    'btn-primary-uber mt-2 w-full py-3 text-sm transition-opacity',
    'mt-2 flex w-full items-center justify-center rounded-xl bg-ink/10 backdrop-blur-[40px] border border-ink/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] py-3 text-[14px] font-bold text-ink shadow-lg active:scale-[0.98] transition'
  );
  
  tsx = tsx.substring(0, startIdx) + section + tsx.substring(endIdx);
  fs.writeFileSync('src/routes/index.tsx', tsx);
}
