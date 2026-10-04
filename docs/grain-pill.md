# Grain pill

The pill stays inside Grain. It shows the Grain logo while compact, expands on tab changes and feedback, and returns to compact after three seconds. A tap expands it; tapping an expanded page title opens streak details. An expanded feedback action runs when tapped. Horizontal or upward swipes dismiss it.

`GrainPill` owns its display state independently of the dashboard. `usePillMotion` coordinates size, corner radius, and copy using one 450 ms spring. Interrupted transitions start from the current visible pose. Dragging updates the element directly without rendering the dashboard on each pointer event. Reduced motion skips animation.

## Camera placement

`GrainDisplayPlugin` reports Android window cutout bounds and status-bar height relative to the WebView, in physical pixels. `usePillPlacement` converts those coordinates into CSS pixels. A single small centered cutout in portrait can sit inside the pill; text and the logo remain outside the reported cutout. Corner cameras, wide notches, multiple cutouts, and landscape use a centered pill below the status bar. No camera or overlay permission is requested.

Settings → Quick access → Grain pill is a compact card with an on/off switch. Placement controls expand on demand: automatic placement, manual horizontal/vertical offsets, size, reset, and an in-app preview. Preferences stay on this device under `grain_pill_placement`. Disabling the pill preserves calibration and uses an ordinary feedback toast for messages and Undo actions. Placement keeps the expanded surface within screen edges. Adjustments that break camera clearance move the pill below the cutout.

Android reports an exclusion rectangle, which may differ from a camera's visible circle. Actual phone alignment needs verification with the rebuilt APK; manual adjustment covers imperfect device geometry. Browsers have no native cutout geometry and use safe-area placement.

## Verification

- Placement tests cover centered, corner, wide, multiple, landscape, physical/CSS scaling, manual bounds, and corrupt preferences.
- Browser checks cover interrupted springs, three-second feedback, actions, swipe dismissal, canceled touches, theme readability, settings, and reduced motion.
- Native compilation and unit tests check the Android integration. The rebuilt v1.18 APK includes the new plugin and settings.
