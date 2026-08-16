# React Native Skia research: dots and team shapes

Research date: 2026-08-16

Scope: current package status, recent official changes, and practical improvements for the unified allocation scene, `team-result-artwork.tsx`, and `dot-shapes.ts`. Sources are limited to Shopify's React Native Skia documentation/repository, the package registry, and Expo documentation.

## Executive summary

- The current stable release is **`@shopify/react-native-skia` 2.11.0**. The project is pinned to exactly `2.11.0`; its native Skia packages use milestone 152 ([package registry metadata](https://registry.npmjs.org/@shopify%2freact-native-skia/latest)).
- The most relevant recent public API change is the immutable Path API introduced in 2.6.0. It separates mutable construction (`Skia.PathBuilder`) from immutable paths and adds static factories/operations. This app already uses the modern static `Skia.Path.Circle` and `Skia.Path.Polygon` APIs ([2.6.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.6.0), [Path migration guide](https://shopify.github.io/react-native-skia/docs/shapes/path-migration/)).
- For better-looking shapes, the first improvement should be **better geometry**, not a library migration: construct the wave and squircle with smooth cubic curves, and explicitly choose round or miter joins for the outlined polygon/spike shapes.
- The allocation scene now uses one Canvas for all live and Revealed Player artwork. This replaces the previous 12 always-mounted live canvases plus as many as five frozen canvases, which could exceed the browser's WebGL-context budget ([Skia web support](https://shopify.github.io/react-native-skia/docs/getting-started/web/)).

## Version and compatibility status

### Current stable

`2.11.0` is the package registry's `latest` dist-tag as of the research date. It upgrades the bundled native Skia packages from milestone 150 to 152 and includes typed bindings and Reanimated selector improvements ([registry](https://registry.npmjs.org/@shopify%2freact-native-skia/2.11.0)).

The app's dependency set satisfies 2.11.0's published peer requirements:

| Dependency   |    App | Skia 2.11.0 requirement |
| ------------ | -----: | ----------------------: |
| React        | 19.2.3 |                 >= 19.0 |
| React Native | 0.86.2 |                 >= 0.78 |
| Reanimated   |  4.5.1 |                >= 4.0.0 |
| Worklets     | 0.10.1 |                >= 0.7.0 |

The requirements come from the official package metadata ([registry](https://registry.npmjs.org/@shopify%2freact-native-skia/2.11.0)).

### Expo caveat

Expo SDK 57 uses React Native 0.86 and React 19.2.3, matching this repository ([Expo SDK reference](https://docs.expo.dev/versions/latest/)). However, Expo Go may include a different Skia native version, while this project deliberately pins 2.11.0 and excludes Skia from Expo's dependency-version validation ([Expo Skia page](https://docs.expo.dev/versions/latest/sdk/skia/)).

That setup is reasonable for a custom development/production build, where 2.11.0's native code is compiled into the app. Do not assume the same JavaScript/native combination is covered by Expo Go: validate allocation rendering in a development build on iOS and Android after native dependency changes.

## Recent changes that matter here

### Immutable paths and `PathBuilder` (2.6.0)

Skia paths are now immutable query objects. Complex paths should be assembled with `Skia.PathBuilder.Make()` and finished with `.build()`. Shape factories such as `Circle`, `Rect`, `RRect`, and `Polygon` are static. Operations such as `Stroke`, `Trim`, `Simplify`, `Dash`, and `Interpolate` are also static and may return `null` ([migration guide](https://shopify.github.io/react-native-skia/docs/shapes/path-migration/)).

Impact on this app:

- `Skia.Path.Circle(...)` in the allocation scene is current.
- `Skia.Path.Polygon(points, true)` in `dot-shapes.ts` is current.
- A `PathBuilder` is the right tool for genuinely curved wave/squircle outlines using `cubicTo` or `quadTo`; keeping a mutable builder as the rendered path would not be correct.
- If static path operations are added later, retain a fallback because operations can fail.

### Rendering and memory improvements (2.7–2.11)

- 2.7.0 added on-screen high-color-depth support and improved WebGL context management ([2.7.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.7.0)).
- 2.8.0 fixed WASM memory consumption in the React Native Web reconciler ([2.8.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.8.0)).
- 2.10.0 moved host objects to native states ([2.10.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.10.0)).
- 2.11.0 upgrades the bundled native Skia milestone to 152 and exposes preallocated point and color buffer hooks. The animated mesh does not use them because `Vertices` documents `Point[]` and `string[]` inputs, and the buffer-backed integration produced no visible mesh on iOS or Android.

These are worthwhile improvements, but none replaces the need to minimize Canvas count on web.

The new `Canvas highBitDepth` prop renders a 16-bit-float surface on iOS and a 10-bit surface on Android, reducing visible banding in subtle gradients; it is higher precision, not HDR. On Android it requires the Graphite backend and otherwise falls back to 8-bit ([Canvas documentation](https://shopify.github.io/react-native-skia/docs/canvas/overview/)). The dot artwork's layered radial gradients could benefit on OLED screens, but enabling a heavier surface on every small per-dot canvas is the wrong first experiment. Revisit `highBitDepth` after canvas consolidation, and treat it as an opt-in visual-quality test—especially because Shopify still labels Graphite/WebGPU highly experimental in the installation documentation ([installation guide](https://shopify.github.io/react-native-skia/docs/getting-started/installation/)).

### Reanimated integration

Skia accepts Reanimated shared and derived values directly as component properties and runs these animations on the UI thread. No animated wrapper or `useAnimatedProps` is needed. Skia also documents `useClock`, `usePathValue`, and `usePathInterpolation` for path work ([animation guide](https://shopify.github.io/react-native-skia/docs/animations/animations/), [animation hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/)).

The unified allocation scene is aligned with this model:

- `holdProgress` is passed directly to `Path.end`.
- the shimmer origin/transform and reveal opacity/transform are derived values;
- accessible team numbers remain normal React Native text overlays while continuous artwork transforms stay on the UI thread.

### Path interpolation and morphing

`usePathInterpolation` can animate between shapes, but the input paths must have the same number and types of commands. The current diamond, hexagon, 24-point spike, 72-segment squircle, and 96-segment wave are therefore **not interpolatable as written** ([animation hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/)).

If a reveal morph is desired later, first normalize every identity shape to the same command topology—for example, the same count of cubic segments—or preprocess them with a shape-normalization tool as suggested by Shopify. Do not call path interpolation directly on the current paths.

### Path effects and repeated drawing

Official path effects include:

- `CornerPathEffect` to round sharp corners;
- `DiscretePathEffect` for a hand-drawn/jittered edge;
- `DashPathEffect` for dashed progress/rims;
- `Path1DPathEffect` and `Path2DPathEffect` for stamping a small path along or within another path ([path effects](https://shopify.github.io/react-native-skia/docs/path-effects/)).

These are useful art-direction tools, but a draw-time path effect does not change `geometry.path`, which is also used as the clip in `TeamResultArtwork`. For an outline, fill, gradients, and clip that all match exactly, build rounded curves into the actual path instead of applying a corner effect only to one painted stroke.

For many repeated sprites, `Atlas` draws multiple instances of the same texture efficiently, and its transforms can be animated with worklet-backed buffers at near-zero cost ([Atlas documentation](https://shopify.github.io/react-native-skia/docs/shapes/atlas/)). It is a candidate for frozen/revealed artwork after the five team textures are pre-rendered, but it is not automatically a win for the live shimmer and hold-progress ring.

## Recommendations for this app

### 1. Keep 2.11.0, but use a development build

Keep the exact pin and use a native development build for authoritative iOS/Android validation of 2.11.0.

### 2. Improve the shape paths before adding visual effects

In `dot-shapes.ts`:

- Replace the polyline approximation of the squircle with a small, smooth cubic Bézier construction.
- Replace the 96-edge wave polygon with a cyclic curve whose control points preserve tangent continuity.
- Keep the path memoized by `size` and team shape, as `TeamResultArtwork` already does.
- Decide deliberately whether the spike, hexagon, and diamond are meant to be sharp or softened. If softened, make the rounding part of their geometry so the fill, clip, and all three strokes agree.

This produces cleaner highlights and rims than stacking a path effect onto only one paint pass.

### 3. Make stroke joins explicit

`TeamResultArtwork` draws both the white sticker outline and colored ring without an explicit `strokeJoin`. For the spike especially, the default miter can create long tips or clipping artifacts at small sizes. Use an explicit `strokeJoin` and, if retaining miters, a deliberate miter limit. Round joins are the safer polished default; retain miter joins only where the team identity depends on hard points. Skia exposes stroke join/cap/miter as paint properties ([paint properties](https://shopify.github.io/react-native-skia/docs/paint/properties/)).

### 4. Keep the allocation artwork consolidated

All live and frozen artwork now shares one layer-sized Canvas, shared values, and one shimmer clock. Keep future allocation artwork inside this scene unless profiling demonstrates a reason to introduce a specialized batching primitive such as Atlas.

### 5. Add shape morphing only as a separate feature

For a more expressive reveal, normalize paths and animate a circle-to-team-shape transition with `usePathInterpolation`. This should follow the geometry cleanup, not precede it. The five team paths need identical command topology first.

## Suggested implementation order

1. Explicit stroke joins/miter limits and visual snapshots at base/reveal sizes.
2. Smooth cubic squircle and wave paths, with tests for bounds and non-empty output.
3. Profile the consolidated allocation Canvas and animated mesh on representative devices. Revisit mesh buffers only after a supported `Vertices` integration is documented and visually validated.
4. Optional `highBitDepth` trial on the consolidated canvas, comparing gradient banding and frame/memory cost on real iOS/Android hardware.
5. Optional reveal morph after all team shapes share compatible commands.
6. Optional path effects as art direction, not as a substitute for correct clipping geometry.

## Implemented performance changes

| Measurement                             |                                                                   Before |                                                                                                       After |
| --------------------------------------- | -----------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------: |
| Mounted allocation artwork canvases     |                                       12 live, up to 5 additional frozen |                                                                                                     1 total |
| Scroll-to-JavaScript visibility updates |                                              Up to once per scroll frame |                                                     One swipe-hint event per Session plus scroll completion |
| Reveal snapshot reads                   |                      Repeated JavaScript reads across slot shared values |                                                             One UI-thread snapshot array sent to JavaScript |
| Reveal assignment presentation          |                React state followed by one animation effect per live dot |           One `scheduleOnUI` batch updates every shared team/progress slot before the semantic reveal event |
| Controller test seam                    |        A parallel immutable model not imported by the gesture controller |           Worklet-compatible slot, token, snapshot, and exit primitives shared by production and unit tests |
| Revealed-result accessibility           | Both frozen-round label trees remained available to assistive technology |         Only the current round is exposed; decorative/off-screen layers are hidden on iOS, Android, and web |
| Mesh vertex/color construction          |                  New point objects, arrays, and color strings each frame | Unchanged; buffer-backed `Vertices` rendered only the fallback fill, so the documented arrays were retained |
| Inactive mesh clock                     |                                          Continued running while mounted |                                                            Paused when the route or application is inactive |

The supported `Vertices` implementation still recreates `Point[]`, point
objects, color arrays, and color strings on the application side. The native
benchmark fixture at `/__performance__/mesh` measures the unchanged blurred
mesh, an identical no-blur mesh, and a paused clock; it does not make a
zero-allocation claim.

Five deterministic Playwright states verify unrevealed, countdown, revealed, frozen, and mid-scroll rendering. Every fixture asserts one Canvas and fails on browser page errors. The frozen and mid-scroll fixtures also verify that only the current revealed-result layer remains in the accessibility tree, including both settled Round positions.

The final development-build smoke test rendered the allocation screen on iOS and an active touch on Android without a visible stall or runtime error. This is a qualitative regression check, not an FPS claim; sustained multi-touch behavior and accessibility still require the physical-device matrix in `docs/touch-allocation-validation.md`.
