# Touch allocation native validation

## Automated coverage

- `npm run verify` covers type checking, linting, localization catalogs, and the current unit-test suite.
- The controller tests call the same worklet-compatible lifecycle transition used by the production manual gesture for admission, visibility, count policy, countdown tokens, snapshots, reset/cancel, and exit readiness.
- `npm run test:visual` covers five deterministic allocation states, asserts one dot Canvas, and checks that inactive revealed-result layers are hidden from accessibility.
- With a Release simulator build installed and an iOS simulator booted, `npm run test:native-allocation` temporarily loads the production-disabled native fixture and asserts that two dynamically activated slots both render unrevealed rings. It restores the installed bundle afterward.
- Expo Doctor and the web production export are part of the release verification pass.
- Debug native builds complete for the iOS simulator and Android with Java 17. Android Studio's bundled Java 25 runtime is not compatible with this native toolchain.

On 16 August 2026, an iPhone 17 simulator Release build and Android Debug build
completed successfully. Native simulator validation found and fixed two UI
runtime defects: a non-worklet lifecycle helper crashed when the Session
mounted, and mounting the full revealed artwork for all 12 inactive slots
exhausted Skia's native animated-variable recorder budget before the second
unrevealed ring. Revealed artwork now mounts only for assigned slots. The
native command also verifies that the intended fixture route actually opened
before evaluating ring pixels. The final Release build mounts and exits a
Session, and the dynamic two-ring fixture passes. The paired iPhone 17 was offline and
`adb devices -l` reported no Android device, so the physical matrix below
remains a merge gate.

These checks reduce regression risk but do not replace multi-pointer or assistive-technology testing on native devices.

## Manual device matrix

Run this matrix on both an iOS simulator/device and an Android emulator/device after changes to the scene, gesture controller, Skia, Reanimated, or Gesture Handler.

- Place, move, and lift one through five simultaneous touches; verify artwork remains centered and cleanup completes.
- Move touches into and out of the back, pairing, and player-count control regions; ignored touches must not count or render.
- Lift or cancel a touch during the countdown; progress, haptics, and reveal must invalidate.
- Exceed the exact multi-round count; reveal must remain blocked. In flexible mode, additional supported touches must remain balanced.
- Complete a reveal; verify one frozen result per active touch, correct team labels, audio/haptics, and no duplicate reveal.
- Swipe between frozen rounds and back; verify transforms, opacity, pagination, hint state, input gating, and reset behavior.
- On Android, repeat with three or more fingers and release them in different orders; the permanently mounted manual gesture must not crash or retain slots.
- While one or more pointers are tracked, press Back with another finger; navigation must wait until every tracked pointer receives up/cancel cleanup.
- With VoiceOver and TalkBack, verify each revealed result announces “Player assigned to Team N” once and decorative Canvas content is not announced.
