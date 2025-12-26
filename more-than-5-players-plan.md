# Feature Plan: More Than 5 Players (Multi-Round Selection)

## Goal

Enable 6-10 players by splitting selection into two rounds of up to 5 touches each,
with clear progress, locked carry-over, and a horizontal scroll between rounds.

## UX Requirements (from request)

- Show persistent message after 5 touches: "Max 5 fingers on this device".
- Message acts as a trigger to open a dialog for choosing total players (5–10).
- Multi-round flow must be "fair + obvious":
  - Progress indicator: "Round 1 of 2" (and Round 2).
  - Explicit instruction: "Next 5 players place fingers now".
  - Clear carry-over: first 5 winners stay locked on screen 1; screen 2 slides in
    from the right for round 2.
  - At end, user can scroll horizontally between the two screens with all
    footprints visible.

## Current References

- Touch handling + max touch hint: `src/app/(home)/index.tsx`
- Winner display layer: `src/app/(home)/selected-players-layer.tsx`
- Vertical scroll component: `src/components/screen-scroll-view.tsx`
- Blur-backed dialog/backdrop patterns:
  - `src/components/dialog-blur-backdrop.tsx`
  - `src/components/select/select-blur-backdrop.tsx`
- Dialog example using `presentation="dialog"`: `src/components/select/searchable-dialog-select.tsx`

## Proposed UX Flow

1. User places up to 5 fingers.
2. When 5 fingers are detected, show persistent hint:
   "Max 5 fingers on this device".
3. Tapping the hint opens a dialog to select total player count (5–10).
4. If total players <= 5, keep single round behavior (no horizontal scroll).
5. If total players > 5:
   - Round 1 plays as today (first 5 touches).
   - Lock Round 1 results on screen 1 (left).
   - Slide to screen 2 (right) with instruction:
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
- Place trigger on the persistent hint ("Max 5 fingers on this device") when
  5 touches have been seen at least once during the current session.
- Ensure dialog can be reopened if user wants to change total players.

## Horizontal Screen Plan

- Add a horizontal pager container for the round screens:
  - Consider a new component `HorizontalRoundPager` using `ScrollView`
    with `horizontal`, `pagingEnabled`, `showsHorizontalScrollIndicator={false}`.
  - Use layout cues from `src/components/screen-scroll-view.tsx` and
    `src/components/select/select-blur-backdrop.tsx` for animation patterns,
    but adapt to horizontal slide.
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
4. **Add horizontal pager**
   - Introduce a new horizontal scroll component or inline `ScrollView`.
   - Render round 1 and round 2 screens side-by-side.
5. **End state UX**
   - Allow free swipe between screens once round 2 is complete.
   - Ensure "Max 5 fingers on this device" stays visible after reset.

## Open Questions

- Should the dialog open automatically at first 5-touch event, or only on tap?
- Should the hint be visible while on round 2, or only round 1?
- Should we support cancelling/redoing round 1 after entering round 2?
