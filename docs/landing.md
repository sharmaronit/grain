# Grain website

The public landing page lives in `landing/`. Its entry point is
`landing/src/main.tsx`, the page is in `landing/src/Landing.tsx`, and the styles
are in `base.css` and `landing.css`.

```powershell
cd landing
npm install
npm run dev
npm run build
npm run lint
```

The build emits `landing/dist/` and checks that production glass CSS preserves
the standard `backdrop-filter` declaration required by Chromium.

The three current screenshots are `today.png`, `consistency.png`, and `deck.png`
under `landing/public/screenshots/`. Update those files to refresh the previews.

The Vercel project is linked from `landing/.vercel/`; deploy from `landing/`.
Local credentials and `.vercel/` stay ignored.

The APK button uses the stable GitHub release URL defined in
`landing/src/lib/downloads.ts`. See [Releases](releases.md).
