# Touch allocation native validation

Run this matrix on both an iOS simulator/device and an Android emulator/device after changes to the scene, gesture controller, Skia, Reanimated, or Gesture Handler.

- Place, move, and lift one through five simultaneous touches; verify artwork remains centered and cleanup completes.
- Move touches into and out of the back, pairing, and player-count control regions; ignored touches must not count or render.
- Lift or cancel a touch during the countdown; progress, haptics, and reveal must invalidate.
- Exceed the exact multi-round count; reveal must remain blocked. In flexible mode, additional supported touches must remain balanced.
- Complete a reveal; verify one frozen result per active touch, correct team labels, audio/haptics, and no duplicate reveal.
- Swipe between frozen rounds and back; verify transforms, opacity, pagination, hint state, input gating, and reset behavior.
- On Android, repeat with three or more fingers and release them in different orders; the permanently mounted manual gesture must not crash or retain slots.
- With VoiceOver and TalkBack, verify each revealed result announces “Player assigned to Team N” once and decorative Canvas content is not announced.
