# Grain bottom navigation liquid glass

This file records the approved bottom navigation appearance. The working implementation is in `src/components/BottomNavigation.tsx` and `src/styles.css`. Use those files as the source of truth if values later change.

## Visual recipe

- Use one continuous pill for the four navigation tabs and one separate circular Deck button. Keep exactly one outline on each surface.
- Use a translucent tint: `color-mix(in srgb, var(--canvas) 28%, transparent)`. Use `backdrop-filter: blur(20px) saturate(135%)` and the matching `-webkit-backdrop-filter` to soften the photo behind the controls.
- Draw a thin, quiet rim with `0.5px solid color-mix(in srgb, var(--ink) 34%, transparent)` and a subtle top highlight with `inset 0 1px 0 color-mix(in srgb, var(--ink) 8%, transparent)`.
- Make the active tab a rounded pill inside the main capsule: 3 px inset vertically, `var(--ink)` at 20% for its fill, and a 0.5 px border at 22%. Keep its content above the pill with `z-index: 1`.
- Use theme tokens (`--canvas`, `--ink`, `--body`) with `color-mix()` for translucent surfaces. Avoid hardcoded black or white alpha colors so the result adapts to light and dark themes.

## CSS

```css
.liquid-tabbar {
  position: relative;
  isolation: isolate;
  border-radius: var(--radius-pill);
  border: 0.5px solid color-mix(in srgb, var(--ink) 34%, transparent);
  background: color-mix(in srgb, var(--canvas) 28%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(135%);
  backdrop-filter: blur(20px) saturate(135%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ink) 8%, transparent);
}

.liquid-deck-button {
  border: 0.5px solid color-mix(in srgb, var(--ink) 34%, transparent);
  background: color-mix(in srgb, var(--canvas) 28%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(135%);
  backdrop-filter: blur(20px) saturate(135%);
}

.liquid-tabbar-selection {
  position: absolute;
  z-index: 0;
  top: 3px;
  bottom: 3px;
  border: 0.5px solid color-mix(in srgb, var(--ink) 22%, transparent);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--ink) 20%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ink) 12%, transparent);
  pointer-events: none;
  transition: left 580ms cubic-bezier(0.16, 1, 0.3, 1),
              width 580ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 180ms ease;
}

.liquid-tabbar-item,
.liquid-tabbar-item-active {
  position: relative;
  z-index: 1;
  min-height: 48px;
}

@media (prefers-reduced-motion: reduce) {
  .liquid-tabbar-selection { transition: none; }
}
```

The implementation also adds a faint highlight to `.liquid-tabbar-selection::before` and a small pressed-state scale. Those are finishing touches; the surface, border, blur, and active pill create the look.

## Layout and behavior

- The outer navigation container is fixed, 64 px high, and raised 12 px above the normal safe-area offset: `bottom: calc(max(var(--sa-bottom, env(safe-area-inset-bottom, 0px)), 6px) + 12px)`.
- Its width is `min(360px, calc(100vw - 1.5rem))`. Reserve 68 px on the right for the separate 60 px Deck button. The tab pill is 60 px high with 5 px inner padding; each tab button is 48 px high.
- Set `pointer-events: none` on the full-width fixed container and `pointer-events: auto` on the actual nav and Deck button. This avoids blocking the app behind the gaps.
- Measure the active button relative to the `<nav>` with `getBoundingClientRect()`. Set the selection pill's `left` and `width` from those measurements. A `ResizeObserver` on the nav keeps the pill aligned when its width changes.
- Keep four equal-width tab buttons, icon above label, with `aria-current="page"` on the active tab and `aria-label="Main navigation"` on the nav. Give the separate Deck button an `aria-label`.

## Production blur declarations

Always place `-webkit-backdrop-filter` before `backdrop-filter`. The CSS optimizer
can collapse this pair to its last declaration. Chromium and Android WebView
require the standard property; a bundle containing only the Safari prefix loses
the blur. Both builds check the emitted CSS after compilation to prevent this.

## Avoid the doubled border

Do not wrap this navigation in the `liquid-glass-react` `LiquidGlass` component. Its rendered surface added an outer capsule even after CSS attempted to remove its border. The current effect is built directly on the native `<nav>` and Deck `<button>`. Also avoid adding another bordered parent around `.liquid-tabbar` or a second dark backing layer.

When adapting this effect elsewhere, inspect it over both a bright and a dark portion of the background. The rim should remain visible but unobtrusive, the photo should appear softened through the blur, and the active tab label should stay readable.

## App-wide application

The main screens use the same thin rim and 4 px blur through the `liquid-glass`, `card-uber`, `card-soft`, `liquid-control`, and `habit-list-surface` styles in `src/styles.css`. Use one glass surface per card; avoid stacking a second bordered or blurred row directly inside it. For small buttons and chips, use `liquid-control`.

Sheets, dialogs, and dropdowns need a more solid reading surface. Add `sheet-glass` to those containers; it uses a stronger canvas fill and 12 px blur while keeping the same theme tokens. The current preference is subtle glass on the main screens and cards, with sheets more solid.
