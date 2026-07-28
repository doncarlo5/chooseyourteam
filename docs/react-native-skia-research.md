# React Native Skia research: dots and team shapes

Research date: 2026-07-28

Scope: current package status, recent official changes, and practical improvements for `dot.tsx`, `team-result-artwork.tsx`, and `dot-shapes.ts`. Sources are limited to Shopify's React Native Skia documentation/repository, the package registry, and Expo documentation.

## Executive summary

- The current stable release is **`@shopify/react-native-skia` 2.10.0**, released on 2026-07-23. The project is already pinned to exactly `2.10.0`, so there is no Skia package upgrade to make today. The release migrates Skia objects from host objects to native states; this is an internal architecture change, not a new shape-drawing API ([2.10.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.10.0), [package registry metadata](https://registry.npmjs.org/@shopify%2freact-native-skia/latest)).
- The most relevant recent public API change is the immutable Path API introduced in 2.6.0. It separates mutable construction (`Skia.PathBuilder`) from immutable paths and adds static factories/operations. This app already uses the modern static `Skia.Path.Circle` and `Skia.Path.Polygon` APIs ([2.6.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.6.0), [Path migration guide](https://shopify.github.io/react-native-skia/docs/shapes/path-migration/)).
- For better-looking shapes, the first improvement should be **better geometry**, not a library migration: construct the wave and squircle with smooth cubic curves, and explicitly choose round or miter joins for the outlined polygon/spike shapes.
- For performance—especially on web—the biggest opportunity is architectural: there is currently one animated Skia `Canvas` per live dot and one `Canvas` per frozen dot. Browsers commonly limit a page to 16 WebGL contexts; Shopify explicitly warns about this and recommends context destruction only for static canvases. A shared canvas is a stronger fit for these animated dots ([Skia web support](https://shopify.github.io/react-native-skia/docs/getting-started/web/)).

## Version and compatibility status

### Current stable

`2.10.0` is both the latest GitHub release and the package registry's `latest` dist-tag as of the research date. The repository's release note contains one feature: migration from host objects to native states ([release](https://github.com/Shopify/react-native-skia/releases/tag/v2.10.0), [merged implementation PR](https://github.com/Shopify/react-native-skia/pull/3964)).

The app's dependency set satisfies 2.10.0's published peer requirements:

| Dependency | App | Skia 2.10.0 requirement |
| --- | ---: | ---: |
| React | 19.2.3 | >= 19.0 |
| React Native | 0.86.0 | >= 0.78 |
| Reanimated | 4.5.0 | >= 4.0.0 |
| Worklets | 0.10.0 | >= 0.7.0 |

The requirements come from the official package metadata ([registry](https://registry.npmjs.org/@shopify%2freact-native-skia/2.10.0)).

### Expo caveat

Expo SDK 57 uses React Native 0.86 and React 19.2.3, matching this repository ([Expo SDK reference](https://docs.expo.dev/versions/latest/)). However, Expo's SDK 57 Skia page recommends/includes **Skia 2.6.2** in Expo Go, while this project deliberately pins 2.10.0 and excludes Skia from Expo's dependency-version validation ([Expo Skia page](https://docs.expo.dev/versions/latest/sdk/skia/)).

That setup is reasonable for a custom development/production build, where 2.10.0's native code is compiled into the app. Do not assume the same JavaScript/native combination is covered by Expo Go: validate dot rendering in a development build on iOS and Android after native dependency changes. If Expo Go compatibility is a hard requirement, use Expo's recommended Skia version instead of suppressing the version check.

## Recent changes that matter here

### Immutable paths and `PathBuilder` (2.6.0)

Skia paths are now immutable query objects. Complex paths should be assembled with `Skia.PathBuilder.Make()` and finished with `.build()`. Shape factories such as `Circle`, `Rect`, `RRect`, and `Polygon` are static. Operations such as `Stroke`, `Trim`, `Simplify`, `Dash`, and `Interpolate` are also static and may return `null` ([migration guide](https://shopify.github.io/react-native-skia/docs/shapes/path-migration/)).

Impact on this app:

- `Skia.Path.Circle(...)` in `dot.tsx` is current.
- `Skia.Path.Polygon(points, true)` in `dot-shapes.ts` is current.
- A `PathBuilder` is the right tool for genuinely curved wave/squircle outlines using `cubicTo` or `quadTo`; keeping a mutable builder as the rendered path would not be correct.
- If static path operations are added later, retain a fallback because operations can fail.

### Rendering and memory improvements (2.7–2.10)

- 2.7.0 added on-screen high-color-depth support and improved WebGL context management ([2.7.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.7.0)).
- 2.8.0 fixed WASM memory consumption in the React Native Web reconciler ([2.8.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.8.0)).
- 2.10.0 moved host objects to native states ([2.10.0 release](https://github.com/Shopify/react-native-skia/releases/tag/v2.10.0)).

These are worthwhile reasons to retain 2.10.0, but none replaces the need to reduce the number of canvases on web.

The new `Canvas highBitDepth` prop renders a 16-bit-float surface on iOS and a 10-bit surface on Android, reducing visible banding in subtle gradients; it is higher precision, not HDR. On Android it requires the Graphite backend and otherwise falls back to 8-bit ([Canvas documentation](https://shopify.github.io/react-native-skia/docs/canvas/overview/)). The dot artwork's layered radial gradients could benefit on OLED screens, but enabling a heavier surface on every small per-dot canvas is the wrong first experiment. Revisit `highBitDepth` after canvas consolidation, and treat it as an opt-in visual-quality test—especially because Shopify still labels Graphite/WebGPU highly experimental in the installation documentation ([installation guide](https://shopify.github.io/react-native-skia/docs/getting-started/installation/)).

### Reanimated integration

Skia accepts Reanimated shared and derived values directly as component properties and runs these animations on the UI thread. No animated wrapper or `useAnimatedProps` is needed. Skia also documents `useClock`, `usePathValue`, and `usePathInterpolation` for path work ([animation guide](https://shopify.github.io/react-native-skia/docs/animations/animations/), [animation hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/)).

The current dot implementation is already aligned with this model:

- `holdProgress` is passed directly to `Path.end`.
- the shimmer origin/transform and reveal opacity/transform are derived values;
- the React Native `interpolateColor` call affects a React Native border, not a Skia color, so it does not violate Skia's warning to use `interpolateColors` for Skia colors.

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

### 1. Keep 2.10.0, but use a development build

No dependency edit is needed. Keep the exact pin until a later patch is tested. Because Expo Go currently documents Skia 2.6.2, use a native development build for authoritative iOS/Android validation of 2.10.0.

### 2. Improve the shape paths before adding visual effects

In `dot-shapes.ts`:

- Replace the polyline approximation of the squircle with a small, smooth cubic Bézier construction.
- Replace the 96-edge wave polygon with a cyclic curve whose control points preserve tangent continuity.
- Keep the path memoized by `size` and team shape, as `TeamResultArtwork` already does.
- Decide deliberately whether the spike, hexagon, and diamond are meant to be sharp or softened. If softened, make the rounding part of their geometry so the fill, clip, and all three strokes agree.

This produces cleaner highlights and rims than stacking a path effect onto only one paint pass.

### 3. Make stroke joins explicit

`TeamResultArtwork` draws both the white sticker outline and colored ring without an explicit `strokeJoin`. For the spike especially, the default miter can create long tips or clipping artifacts at small sizes. Use an explicit `strokeJoin` and, if retaining miters, a deliberate miter limit. Round joins are the safer polished default; retain miter joins only where the team identity depends on hard points. Skia exposes stroke join/cap/miter as paint properties ([paint properties](https://shopify.github.io/react-native-skia/docs/paint/properties/)).

### 4. Consolidate canvases if dot count can exceed the web context budget

The live and frozen layers instantiate a canvas for every dot. On web, this can exceed the documented 16-context limit. Prefer one layer-sized `Canvas` containing groups for all dots, driven by the existing shared values and one clock. This also avoids a separate reconciler/canvas lifecycle per dot.

If that refactor is too large initially:

- consolidate frozen dots first because they are static;
- consider pre-rendering the five team artworks and drawing them as images/Atlas entries;
- use `__destroyWebGLContextAfterRender` only for canvases that are truly static—the official docs warn that animated canvases pay the cost of recreating the context every render.

### 5. Add shape morphing only as a separate feature

For a more expressive reveal, normalize paths and animate a circle-to-team-shape transition with `usePathInterpolation`. This should follow the geometry cleanup, not precede it. The five team paths need identical command topology first.

## Suggested implementation order

1. Explicit stroke joins/miter limits and visual snapshots at base/reveal sizes.
2. Smooth cubic squircle and wave paths, with tests for bounds and non-empty output.
3. One shared canvas for frozen dots, then profile live dots before expanding the refactor.
4. Optional `highBitDepth` trial on the consolidated canvas, comparing gradient banding and frame/memory cost on real iOS/Android hardware.
5. Optional reveal morph after all team shapes share compatible commands.
6. Optional path effects as art direction, not as a substitute for correct clipping geometry.
