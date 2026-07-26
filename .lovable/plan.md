# Fix the 4 issues found in QA

All changes are contained in `src/routes/index.tsx`. No new deps, no styling changes beyond reusing the existing liquid‑glass primitives.

## 1. Habit row tap opens Habit Detail Modal
- In `HabitRow`, add an `onClick` on the row body (excluding the +/− numeric buttons and any swipe surface) that calls the parent `onOpenDetail(habit.id)`.
- Wire `onOpenDetail` from the home component through to the row so tapping the visible card content sets `activeHabitId` and opens the existing `HabitDetailModal`.
- Guard: the click must not trigger during/after a swipe (skip if `Math.abs(dragX) > 8` on pointerup).

## 2. Create Habit sheet gets the missing fields
Expand `CreateHabitSheet` so it mirrors the Edit sheet:
- **Category** chips: Deep / Health / Growth / Rest (single‑select, default Deep).
- **Type** segmented control: Binary / Numeric — when Numeric, show a `target` number input and a unit hint (e.g. "pages", "min").
- **Time of day** chips: Morning / Afternoon / Evening / Anytime (default Anytime).
- Persist all fields into the new habit object; defaults keep existing behavior intact.
- Reuse the same chip/toggle components already used in `EditHabitSheet` so the two sheets stay visually consistent.

## 3. Bottom sheets close on Escape and on backdrop click
Centralize this in the shared `Sheet` (or equivalent) wrapper used by Settings, Streak Detail, Create Habit, Edit Habit, Profile Edit, Filter, etc.:
- Add `onKeyDown` at document level while open → close on `Escape`.
- Add `onClick` on the backdrop overlay that closes the sheet, while `onClick` on the sheet body stops propagation.
- Verify no sheet currently overrides these so all six sheets pick up the fix in one place.

## 4. Accessible tap‑to‑complete on each habit row
- Add a round check button (reusing the "UP NEXT" checkmark style) at the trailing edge of every `HabitRow`, with `aria-label="Mark {name} done"` / `aria-label="Undo {name}"` when already done.
- Tapping toggles completion with the same haptic + heatmap update the swipe path uses (call the same `toggleHabit` handler so behavior is identical).
- Keep the existing swipe gestures — the button is an additive, accessible fallback.

## Verification
After the edits I'll rerun the deep QA Playwright script and confirm:
- Tapping a habit row opens the Detail modal.
- New Create sheet shows Category / Type+target / Time of day and saves them.
- Escape and backdrop click dismiss every sheet.
- Screen‑reader / non‑touch users can complete a habit via the new check button.
- Settings, wallpaper themes, preview, backup, reset, sign‑out flows (previously blocked by the sheet issue) all run end‑to‑end without pointer interception.

## Out of scope
- No changes to auth, wallpaper preview, backup/export, or theme system.
- No new persistence keys (all four fixes reuse existing `dc.state` shape; new habit fields extend the habit object with safe defaults for older stored data).
