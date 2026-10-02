<!-- LIQUID GLASS THEME RULE:BEGIN -->
> [!IMPORTANT]
> Whenever creating or updating UI elements that use glassmorphism, translucency, or the "liquid glass" effect, **always use color-mixed CSS variables** (e.g. `background: color-mix(in srgb, var(--canvas) 60%, transparent);`) instead of hardcoded `rgba(0,0,0,X)` or `rgba(255,255,255,X)`. This ensures the UI properly adapts to both dark and light modes!
<!-- LIQUID GLASS THEME RULE:END -->
# Project Map
- `src/api/` → see `src/api/AGENTS.md`
- `src/ui/` → see `src/ui/AGENTS.md`
- Build: `npm run build`
- Test: `npm test -- --bail`

# Rules
- Byte-cap all command output: `CMD 2>&1 | head -c 4000`
- Never rewrite full files; use unified diffs only
- No preamble, no trailing summary   