# Feature Plan: More Than 5 Players (Multi-Round Selection)

## Goal

Enable 6-10 players by splitting selection into two rounds of up to 5 touches each,
with clear progress, locked carry-over, and a vertical scroll between rounds.

## UX Requirements (from request)

- Show a persistent "+5" trigger after 5 touches (same UI as the close button).
- The "+5" trigger stays visible on both round screens.
- The "+5" trigger opens a dialog for choosing total players (5–10).
- Multi-round flow must be "fair + obvious":
  - Progress indicator: "Round 1 of 2" (and Round 2).
  - Explicit instruction: "Next 5 players place fingers now".
  - Clear carry-over: first 5 winners stay locked on screen 1; screen 2 scrolls
    down into view for round 2.
  - At end, user can scroll vertically between the two screens with all
    footprints visible.

## Current References

- Touch handling + max touch hint: `src/app/(home)/index.tsx`
- Winner display layer: `src/app/(home)/selected-players-layer.tsx`
- Vertical scroll component (note: current component is vertical):
  `src/components/screen-scroll-view.tsx`
- Blur-backed dialog/backdrop patterns:
  - `src/components/dialog-blur-backdrop.tsx`
  - `src/components/select/select-blur-backdrop.tsx`
- Dialog example with blur backdrop:
  `src/app/(home)/components/dialog.tsx` (see `BlurBackdropDialogContent`)
- Full-screen vertical paging example (snap + viewability):
  `src/components/component-presentation/usage-variant-flatlist.tsx`
- Progress indicator example:
  `src/components/component-presentation/pagination-indicator.tsx`

## Other Useful Components to Reuse

- `src/components/app-text.tsx` for consistent typography in the round headers,
  instructions, and dialog labels.
- `src/components/dialog-blur-backdrop.tsx` for the dialog backdrop (already
  used in the dialog examples).
- `src/components/animated-blur-view.tsx` if we need custom blur animation for
  the "+5" dialog presentation.
- `src/components/component-presentation/usage-variants-select/close-button.tsx`
  for a reference of close-button size, hitSlop, and icon-only styling.
- `src/components/component-presentation/usage-variants-select/trigger-button.tsx`
  for the "+5" floating trigger button sizing/position reference.
- `src/components/screen-scroll-view.tsx` for vertical paging and safe-area
  padding defaults (if it fits the full-screen pager).
- `src/components/component-presentation/usage-variant-flatlist.tsx` if we want
  proper vertical paging with `snapToInterval`, `pagingEnabled`, and viewability
  callbacks per round.
- `src/components/component-presentation/pagination-indicator.tsx` if we want a
  subtle "Round 1/2" indicator tied to vertical scroll position.

## Proposed UX Flow

1. User places up to 5 fingers.
2. When 5 fingers are detected, show persistent "+5" trigger
   (same UI as the close button).
3. Tapping the "+5" trigger opens a dialog to select total player count (5–10).
4. If total players <= 5, keep single round behavior (no vertical scroll).
5. If total players > 5:
   - Round 1 plays as today (first 5 touches).
   - Lock Round 1 results on screen 1 (top).
   - Scroll to screen 2 (bottom) with instruction:
     "Next 5 players place fingers now".
   - Round 2 assigns remaining players (total - 5).
6. End state: user can swipe between screen 1 and screen 2, both showing
   footprints for their respective round.

## Data/State Plan

- Add state for:
  - `totalPlayers` (nullable number 5–10).
  - `roundIndex` (0 or 1).
  - `roundCount` (1 or 2).
  - Per-round results: colors + labels per slot (round 1/round 2).
- Split existing `slotRevealColors` and `slotRevealLabels` into per-round buckets
  while reusing slot positions for each round.
- Keep existing `MAX_SLOTS` (12) but cap per round at 5 for input handling.

## Dialog + Picker Plan

- Use existing dialog pattern with `Dialog` + `DialogBlurBackdrop`.
- Content includes `@react-native-picker/picker` to select total players 5–10.
- Place trigger on the persistent "+5" button when 5 touches have been seen
  at least once during the current session.
- Ensure dialog can be reopened if user wants to change total players.

## Vertical Screen Plan

- Add a vertical pager container for the round screens:
  - Reuse `src/components/screen-scroll-view.tsx` (vertical).
  - Use `ScrollView` with `pagingEnabled` and
    `showsVerticalScrollIndicator={false}`.
  - Use layout cues from `src/components/select/select-blur-backdrop.tsx`
    for animation patterns, but adapt to vertical slide.
- Each page renders a round:
  - Top: progress label ("Round 1 of 2", "Round 2 of 2").
  - Center: `SelectedPlayersLayer` wired to that round’s reveal arrays.
  - Instruction: only on round 2 ("Next 5 players place fingers now").

## Implementation Steps

1. **Refactor state in** `src/app/(home)/index.tsx`
   - Add `totalPlayers`, `roundIndex`, `roundCount`.
   - Convert reveal state to per-round arrays.
2. **Add dialog**
   - Create a small dialog component near the hint area that wraps a
     `Picker` and stores `totalPlayers`.
3. **Update touch logic**
   - Keep max-touch detection at 5.
   - After round 1 reveal completes, if `totalPlayers > 5`, advance to round 2.
   - Ensure assignments only use remaining player count for round 2.
4. **Add vertical pager**
   - Use `src/components/screen-scroll-view.tsx` or inline `ScrollView`.
   - Render round 1 and round 2 screens stacked vertically.
5. **End state UX**
   - Allow free vertical swipe between screens once round 2 is complete.
   - Ensure the "+5" trigger stays visible after reset and on both screens.
