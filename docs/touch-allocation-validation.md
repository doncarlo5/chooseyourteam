# Touch allocation native validation

## Automated coverage

- `npm run verify` covers type checking, linting, localization catalogs, and the current unit-test suite.
- The controller tests call the same worklet-compatible lifecycle transition used by the production manual gesture for admission, visibility, count policy, countdown tokens, snapshots, reset/cancel, and exit readiness.
- `npm run test:visual` covers five deterministic allocation states, asserts one dot Canvas, and checks that inactive revealed-result layers are hidden from accessibility.
- With a Release simulator build installed and an iOS simulator booted, `npm run test:native-allocation` temporarily loads the production-disabled native fixture and asserts that two dynamically activated slots both render unrevealed rings. It restores the installed bundle afterward.
- With a Release build containing the production-disabled fixture installed on Android, `node scripts/check-android-round-two-allocation.mjs` reproduces the Multi-Round transition with five revealed first-Round Players and asserts that both second-Round unrevealed rings render. `ALLOCATION_FROZEN_COUNT=1` through `5` exercises the complete first-Round range.
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
Session, and the dynamic two-ring fixture passes.

On 18 August 2026, physical-device testing covered the two regressions found
during this refactor:

- On an iPhone 17, revealed Player positions remain frozen while every native
  pointer stays owned until up/cancel cleanup. Moving fingers after reveal no
  longer moves translucent artwork.
- On a Huawei EML-L29 running Android 10, the second Round of a Multi-Round
  Session accepted touches but initially rendered no unrevealed rings. The
  deterministic fixture reproduced this as `0 / 0` detected ring pixels when
  an animated frozen-Round group contained one or more complex vector Team
  results. Pre-rendering the five immutable Team results as non-texture Skia
  images changed the signal to `31,488 / 31,488` pixels for every frozen count
  from one through five. The user then confirmed the real `+5` flow renders
  second-Round touches correctly on the same device.

These targeted physical checks passed. The portions of the broader matrix not
explicitly exercised below remain a merge gate.

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
