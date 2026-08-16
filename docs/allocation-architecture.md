# Allocation architecture

This document replaces the temporary architecture HTML generated on 16 August 2026 and reconciles the Shopify examples, the Medium article, the third-party Reanimated/Skia performance skill, and the architecture review against the implementation on this branch.

## Current structure

```mermaid
flowchart TD
  Home[Home: setup and Session mount]
  Session[AllocationSessionScreen]
  State[Session progression and current-Round projection]
  Navigation[Private Round navigation]
  Scene[TouchAllocationScene]
  Lifecycle[Player allocation lifecycle]
  Feedback[Audio, haptics, toast adapters]
  Canvas[One Skia allocation Canvas]
  Labels[React Native accessible labels]
  Mesh[Independent mesh Canvas]

  Home -->|immutable Team count + Pairing Mode| Session
  Session --> State
  Session --> Navigation
  Session --> Scene
  Navigation -->|private scroll shared value| Scene
  Scene --> Lifecycle
  Lifecycle -->|discrete effects| Feedback
  Lifecycle --> Canvas
  Lifecycle --> Labels
  Mesh -. setup and Session background .-> Home
```

`Home` knows only whether setup or an active Session is visible. The Session's external interface is `configuration` plus `onExit`; Player count, Fair Allocation planning, snapshots, reset keys, touch state, Round mechanics, controls, and the pointer-safe exit handshake are private implementation details.

## Reconciled feedback matrix

| Source and recommendation                                       | Result                                         | Implementation or reason                                                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopify examples: one Canvas for live and revealed artwork      | Implemented                                    | Twelve possible live slots and both Round snapshots share one allocation Canvas and one shimmer clock. The independent mesh remains separate.                                       |
| Shopify examples: continuous values on the UI thread            | Implemented                                    | Position, visibility, scale, countdown, reveal, shake, and scroll transforms use shared values/worklets.                                                                            |
| Shopify examples: semantic JavaScript crossings                 | Implemented                                    | JavaScript receives discrete count, reveal, swipe-hint, navigation-settled, feedback, and exit-ready events; drag lifecycle and scrolling remain on the UI thread.                  |
| Shopify examples: deterministic reducer and injected planning   | Implemented                                    | Multi-Round planning occurs before the Session action; replaying the completed plan is deterministic.                                                                               |
| Shopify examples: a deeper allocation module                    | Implemented                                    | The active flow is behind `AllocationSessionScreen`; production and deterministic fake-clock tests use the same token-bearing transition and lifecycle-effect seam.                 |
| Shopify examples: visual regression                             | Implemented                                    | Five deterministic baselines assert one Canvas; additional assertions cover both settled accessibility projections and duplicate-label absence.                                     |
| Medium: hybrid React Native/Skia screen                         | Implemented                                    | React Native owns controls, navigation, instructions, and accessibility; Skia owns artwork. ADR 0003 remains authoritative for this seam.                                           |
| Medium: use a frame callback only for continuous work           | Implemented                                    | Allocation remains event-driven. Only the continuously animated mesh uses a pausable frame callback.                                                                                |
| Medium: keep semantic Session state in React/reducer            | Implemented                                    | The Session reducer owns declared count, plans, Round state, and Revealed Players.                                                                                                  |
| Medium: preserve accessibility outside Skia                     | Implemented                                    | Localized React Native labels expose only the current Round result set; decorative Skia artwork is not accessible.                                                                  |
| Third-party skill: transforms instead of animated layout        | Implemented                                    | Allocation artwork uses Skia transforms rather than animated `left`, `top`, `width`, or `height`.                                                                                   |
| Third-party skill: one UI-thread snapshot and atomic assignment | Implemented                                    | Countdown completion creates one ordered snapshot; JavaScript allocates Teams; one scheduled UI worklet applies every Team/progress cell before the semantic reveal.                |
| Third-party skill: preserve Android pointer cleanup             | Implemented in code; device validation pending | The manual gesture remains mounted, gates only new admissions, and always handles up/cancel. Exit waits for every tracked pointer.                                                  |
| Third-party skill: preallocated mesh buffers                    | Rejected after experiment                      | Skia's supported `Vertices` interface uses `Point[]` and color arrays. Buffer-backed inputs rendered no mesh on tested builds, so the supported path was restored.                  |
| Third-party skill: no per-frame mesh allocation                 | Not claimed                                    | The application recreates point arrays, point objects, color arrays, and color strings in derived values. The benchmark isolates observed cost instead of claiming zero allocation. |
| Third-party skill: measure full-screen blur                     | Fixture implemented; device evidence pending   | Environment-gated routes compare the unchanged mesh with blur, the identical overscanned mesh without blur, and a paused clock.                                                     |
| Third-party skill: `.get()`/`.set()` consistency                | Implemented in scope                           | Allocation Session, Round navigation, scene/controller, feedback animation, and mesh code use compiler-facing accessors where supported. Unrelated modules are deferred.            |

## Implementation references

- React effects follow the official `useEffect` setup/cleanup and dependency guidance: <https://react.dev/reference/react/useEffect>.
- Shared values use the React Compiler-compatible accessors documented by Reanimated: <https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/>.
- Round drag and momentum phases follow React Native's `ScrollView` event model: <https://reactnative.dev/docs/scrollview>.
- The permanently mounted manual gesture follows Gesture Handler's UI-thread lifecycle model: <https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/state-manager/>.
- Deterministic scheduling tests use Vitest's documented fake-timer controls: <https://vitest.dev/guide/mocking/timers>.

## Architecture-review candidates

| Candidate from the temporary review | Resolution                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deepen Player allocation lifecycle  | Implemented. One transition owns admission, identity, visibility/count policy, tokens, snapshots, reset/cancel, and deferred exit. Reanimated cells/effects are the production adapters; in-memory cells, a fake clock, and recorded effects are the test adapters. |
| Deepen Session progression          | Implemented. Session rules and current-Round projection moved out of `Home`.                                                                                                                                                                                        |
| Deepen Revealed Player presentation | Retained from PR #2. Live/frozen artwork and React Native labels use the shared scene projection, with settled-Round accessibility tests.                                                                                                                           |
| Deepen Round navigation             | Implemented. Offset, threshold, reset, arrows, pagination, drag/momentum settlement, and gating are private to the Session; only threshold and settlement cross to JavaScript.                                                                                      |

## Mesh benchmark protocol

Build with `EXPO_PUBLIC_ENABLE_NATIVE_PERF_FIXTURES=true` and open one fixed route at a time:

- `/__performance__/mesh?scenario=current`
- `/__performance__/mesh?scenario=no-blur`
- `/__performance__/mesh?scenario=paused`

The no-blur scenario retains the production 28-point overscan so blur is the only mesh parameter changed. Warm up for five seconds, record for 30 seconds, and capture the device model, OS, build type, frame behavior, hitches, and CPU/GPU observations. Use Instruments on iOS and `adb shell dumpsys gfxinfo <package> reset` followed by `adb shell dumpsys gfxinfo <package>` on Android.

## Evidence status

| Evidence                                                                 | Status                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, lint, localization, 218 unit tests                           | Passed on 16 August 2026. Lint retained six pre-existing warnings in unrelated showcase controls and reported no errors.        |
| Five Playwright baselines and accessibility assertions                   | Six checks passed on Desktop Chrome at a 390 × 844 viewport.                                                                    |
| Expo Doctor and web export                                               | Expo Doctor passed 21/21 checks; static web export completed.                                                                   |
| iOS and Android native builds                                            | iPhone 17 simulator Release and Android Debug builds completed successfully; the iOS build also launched without logged errors. |
| Physical iPhone 17 matrix and profiling                                  | Blocked: the paired iPhone 17 remained offline when device discovery was repeated after the fixes.                              |
| Physical Android matrix, TalkBack, three-pointer ordering, and profiling | Blocked: `adb devices -l` reported no attached Android device after the fixes.                                                  |

The physical-device rows are a merge gate, not inferred from simulator, build, or screenshot success.

## Deliberate deferrals

Atlas, shaders, path morphing, physics loops, a generic game engine, adaptive low-end rendering, an interactive tuning panel, native E2E tooling, CI workflows, and a repository-wide shared-value migration remain deferred. They should be reconsidered only after another game or real-device measurements provide evidence for a deeper shared interface or a visual/performance trade-off.
