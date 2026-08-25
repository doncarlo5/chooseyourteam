# Multi-Round Player Selection

## Current behavior

The home screen owns the platform-specific editable setup. Pressing Start
snapshots the Player policy together with the Team count and hidden Pairing
Mode.

- Android hides the Player stepper and always starts an observed Single-Round
  Session. Its minimum equals the Team count and its maximum is twelve detected
  contacts, subject to the Android device's multitouch capability.
- iPhone, iPad, and web show Teams first, followed by `More players: 5+`.
  `5+` remains the Observed Player Count presentation; pressing plus moves to
  exact totals from 6 through 10.
- `6–10` starts a Multi-Round Session. Round one expects five Players and Round
  two expects the declared remainder, so neither planned Round exceeds five.
- A thirteenth Android contact is ignored with localized capacity feedback.
- Player and Team settings are immutable while a Session is active. Back safely
  exits the touch scene and returns to the same setup values.

## Ownership

`Home` owns only draft setup values and the active configuration snapshot.
`AllocationSessionScreen` owns assignment planning, touch lifecycle, Round
navigation, revealed snapshots, and safe exit. There is no in-Session `+5`
button or player-count dialog.

## Validation

- Verify that Android omits the Player controls and forces an Observed Player
  Count while iOS/web expose every transition: `5+`, 6, 7, 8, 9, and 10.
- Verify that each minus control is absent at its minimum, appears after an
  increase, and retains its reserved layout column.
- Verify two-to-five Team stepper limits and preserved values after Back.
- Verify exact Round sizes `5 + 1` through `5 + 5`.
- Validate VoiceOver, TalkBack, iOS five-touch handling, Android observed
  admission, the twelve-contact ceiling, and six simultaneous contacts on a
  physical Android device without changing the permanently mounted gesture
  lifecycle.
