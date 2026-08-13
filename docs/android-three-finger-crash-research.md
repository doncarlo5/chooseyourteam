# Android three-finger crash: official guidance

Research date: 2026-08-13

Scope: React Native Skia 2.10.0 and React Native Gesture Handler 2.32.0, the versions installed by this project. Sources are limited to the maintainers' official documentation and source repository.

## Conclusion

The fatal Android stack is a Gesture Handler lifecycle failure, not a Skia rendering failure. The unsafe transition is changing a mounted manual gesture's `enabled` configuration while Android is still tracking the fingers. Keep the handler enabled for its mounted lifetime, gate only the acceptance of **new** touches with a Reanimated shared value, and let the current stream reach `onTouchesUp` or `onTouchesCancelled` before ending/resetting it. Skia can remain mounted and continue receiving shared values.

## Evidence

- Gesture Handler documents `enabled(false)` as a lifecycle transition: if the value changes after recognition has begun, the handler immediately becomes `FAILED` or `CANCELLED`. It is therefore not merely an input filter ([Manual gesture configuration](https://docs.swmansion.com/react-native-gesture-handler/docs/legacy-gestures/manual-gesture/#config)).
- The exact Android implementation in RNGH 2.32.0 confirms this. Changing `isEnabled` while the handler has a view schedules `cancel()` on the UI thread; cancellation calls `moveToState(STATE_CANCELLED)`, which notifies the orchestrator ([setter, lines 42–53](https://github.com/software-mansion/react-native-gesture-handler/blob/v2.32.0/packages/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/GestureHandler.kt#L42-L53), [cancellation, lines 680–688](https://github.com/software-mansion/react-native-gesture-handler/blob/v2.32.0/packages/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/GestureHandler.kt#L680-L688), [state notification, lines 581–582](https://github.com/software-mansion/react-native-gesture-handler/blob/v2.32.0/packages/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/GestureHandler.kt#L581-L582)). This matches the observed `set_isEnabled_ -> cancel -> moveToState` crash.
- A manual gesture does not finish automatically when every pointer is lifted. The official example explicitly deactivates it when `numberOfTouches === 0`, and warns that cancelled pointers should be cleared in `onTouchesCancel` ([Manual gesture guide](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-manual-gesture/)).
- Gesture Handler guarantees lifecycle cleanup callbacks: a gesture that began later receives `onFinalize`, and an activated gesture later receives `onDeactivate`; `onTouchesCancel` means no more events will arrive for the pointer ([Callbacks and events](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/callbacks-events/)).
- Skia's `Canvas` is a regular React Native view backed by its own renderer. Skia officially supports passing Reanimated shared and derived values directly to drawing properties so updates execute on the UI thread ([Canvas overview](https://shopify.github.io/react-native-skia/docs/canvas/overview/), [Animations](https://shopify.github.io/react-native-skia/docs/animations/animations/)). No Skia API requires changing the gesture handler's native configuration when results appear.

## Recommended application pattern

1. Construct the mounted `Gesture.Manual()` without a result-driven `.enabled(...)` value.
2. Mirror whether new touches are allowed into a `SharedValue<boolean>` and check it at the start of `onTouchesDown`. This changes application behavior on the UI thread without forcing a native handler-state transition.
3. Continue processing already-tracked pointers after results appear so Android can deliver their up/cancel events safely.
4. Clear tracked slots in both `onTouchesUp` and `onTouchesCancelled`; end the manual gesture only once no pointers remain.
5. Keep the Skia canvas/dots driven by shared values during that completion. React state may control the visible result, but it should not detach or disable the active recognizer mid-stream.

Items 2, 3, and 5 are an engineering inference from the documented lifecycle and the 2.32.0 Android implementation. They avoid the exact transition in the crash while following Skia's supported UI-thread shared-value integration.
