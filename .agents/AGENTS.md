<!-- LIQUID GLASS THEME RULE:BEGIN -->
> [!IMPORTANT]
> Whenever creating or updating UI elements that use glassmorphism, translucency, or the "liquid glass" effect, **always use color-mixed CSS variables** (e.g. `background: color-mix(in srgb, var(--canvas) 60%, transparent);`) instead of hardcoded `rgba(0,0,0,X)` or `rgba(255,255,255,X)`. This ensures the UI properly adapts to both dark and light modes!
<!-- LIQUID GLASS THEME RULE:END -->
