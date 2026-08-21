# React Native Skia performance follow-up

Research date: 18 August 2026

Scope: the official React Native Skia clone at
`/Users/julienthomas/Documents/react-native-skia` (`923ac2c`) compared with
Choose Your Team `main` (`9c3a5e2`). The examples are under the singular path
`apps/example/src/Examples`, not `apps/examples`.

This note uses Shopify source and documentation only. Examples are
authoritative demonstrations of supported APIs, but they are not all
performance recommendations: the example application also contains stress,
crash, and regression fixtures. The strongest performance-specific evidence
comes from `Reanimated/SharedValueComparison` and `Performance/Atlas`.

## Executive conclusion

The application already follows the upstream patterns that matter most at its
current scale: one allocation Canvas, UI-thread gesture/animation state, one
clock for the live scene, memoized static mesh topology, and pre-rendered native
artwork for frozen results.

The best remaining low-risk improvement is to stop the allocation shimmer
clock when no unrevealed live dot is visible. The most promising structural
experiment is to reduce the number of Reanimated mappers by grouping animated
render state, but it should be benchmarked before replacing the existing
independently animated slot cells. Atlas, Pictures, Coons patches, shaders, and
buffer batching do not have a demonstrated benefit for the current scene.

## What the official examples validate

| Official pattern | Current application | Conclusion |
| --- | --- | --- |
| A large scene can live in one Canvas and share one clock. Matrix renders 120 symbols in one Canvas and passes one `useClock()` to them ([Matrix example, lines 34–63](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Matrix/Matrix.tsx#L34-L63), [Symbol, lines 35–62](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Matrix/Symbol.tsx#L35-L62)). | The allocation scene renders all live and frozen artwork in one Canvas and creates one shimmer clock ([allocation scene](../src/screens/components/touch-allocation-scene-content.tsx#L357-L417)). | Keep this architecture. A Canvas per Player would be a regression. |
| Gesture updates stay on the UI thread and JavaScript is reached at a completion boundary. The Transitions example mutates shared progress in `onChange` and calls JS only when `withTiming` completes ([Transitions, lines 69–108](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Transitions/Transitions.tsx#L69-L108)); the Chat drawing overlay saves the completed path only in `onEnd` ([DrawingOverlay, lines 67–103](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Chat/ChatScreen/DrawingOverlay.tsx#L67-L103)). | Touch admission, movement, visibility, and cleanup run in the manual gesture worklet; JS receives discrete touch-count, feedback, and reveal events ([controller](../src/screens/components/use-touch-allocation-controller.tsx#L380-L480)). | Keep. Do not reintroduce JS updates for pointer movement or scroll frames. |
| Static topology/resources are prepared once while dynamic values are derived. The Vertices example memoizes its window, base vertices, triangulation, indices, colors, and noise functions ([Vertices, lines 23–68](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Vertices/Vertices.tsx#L23-L68)). | The mesh memoizes base vertices, indices, and palette conversion ([mesh](../src/screens/components/mesh-gradient-background-content.tsx#L213-L329)). The five immutable Team results are also rendered once as images on native platforms ([allocation scene](../src/screens/components/touch-allocation-scene-content.tsx#L41-L93)). | Keep. This is already stronger than the generic example for frozen artwork. |
| One grouped derived value can replace many per-property mappers. Shopify's comparison explicitly reports one mapper for grouped data versus `COUNT * 3` for per-property derived values and uses `select()` to subscribe drawing props to fields ([SharedValueComparison, lines 19–31 and 63–110](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Reanimated/SharedValueComparison.tsx#L19-L110)). | The controller currently has eight arrays of 12 shared cells, and each live-dot component creates several derived values ([slot cells](../src/screens/components/use-touch-allocation-controller.tsx#L84-L117), [live artwork](../src/screens/components/touch-allocation-scene-content.tsx#L123-L177)). | This is the best **prototype-and-measure** candidate. A wholesale change is not automatically safe because opacity, scale, reveal, and shake use independent timing/spring lifecycles. |
| Atlas is intended for a very large number of similar textures. The official performance example pre-renders one texture, creates 300 sprites, and mutates preallocated RSXforms in a worklet ([Atlas example, lines 30–95](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Performance/Atlas.tsx#L30-L95)); the documentation describes “a very large number” of similar sprites or tiles ([Atlas docs, lines 8–20](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/docs/docs/shapes/atlas.md#L8-L20)). | The allocation scene has at most 12 live slots and five frozen results. Live dots also contain independent progress rings and reveal transitions; frozen results are already rasterized. | Defer Atlas. Revisit it for a future game with hundreds of repeated sprites, not for 12 heterogeneous interactive slots. |
| Pictures are immutable display lists that can be reused, and immediate-mode Pictures are useful when the number of drawing commands varies each frame ([Pictures docs, lines 8–20](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/docs/docs/pictures.md#L8-L20)). | The allocation scene has a fixed declarative topology. Frozen native results already use images, which solved a verified native renderer failure. | Do not replace the scene with per-frame Picture recording. Pictures remain relevant only if a future effect has a genuinely variable draw-command count. |

## Recommended next work

### 1. Gate the allocation shimmer clock — applicable now

`useClock()` is implemented as an always-active Reanimated frame callback
([implementation, lines 57–67](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/packages/skia/src/external/reanimated/interpolators.ts#L57-L67)).
The allocation Canvas mounts it for the entire Session, even when there is no
unrevealed live dot ([allocation scene, lines 373–380](../src/screens/components/touch-allocation-scene-content.tsx#L373-L380)).

Replace that clock with an explicitly controlled frame callback which preserves
elapsed shimmer time and runs only while at least one active, unrevealed slot
needs it. Keep the injectable fixture clock. The mesh already demonstrates the
required focus/app-state pause pattern ([mesh, lines 184–211](../src/screens/components/mesh-gradient-background-content.tsx#L184-L211)).

Expected benefit: eliminate needless UI-thread invalidation during setup,
between touches, and after reveal. Verify battery/frame behavior on physical
iOS and Android; do not claim a gain from code inspection alone.

### 2. Reduce allocation mapper count — prototype before adopting

The official grouped-value comparison is directly relevant, but the allocation
lifecycle is more complex than its continuously recomputed dot field. Prototype
one of these behind the deterministic fixture:

1. a grouped render-state value per slot; or
2. one grouped scene projection whose fields are consumed through `select()`.

Measure mapper count, frame behavior, touch latency, and native rendering on the
iPhone 17 and Huawei EML-L29. Preserve the current separate lifecycle store
unless the grouped model improves measured behavior without breaking
independent `withTiming`/`withSpring` cancellation, stale-token handling, or the
Android pointer lifecycle.

A smaller preparatory change is safe even without that prototype: compute the
identical shimmer rotation once at the scene level instead of creating the same
clock-derived mapper inside every `LiveDotArtwork` instance. Revealed-only
derived transforms/opacities can likewise move into a component mounted only
for assigned slots. These changes reduce mapper count without changing the
domain or gesture stores.

### 3. Finish the existing mesh measurement — evidence first

The current mesh recomputes dynamic `Point[]` and color strings every frame and
applies a full-screen blur layer ([mesh, lines 239–353](../src/screens/components/mesh-gradient-background-content.tsx#L239-L353)).
This is not a divergence from the official Vertices example: Shopify's example
also returns a newly mapped `Point[]` from a derived value each frame
([Vertices, lines 50–78](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Vertices/Vertices.tsx#L50-L78)).
The public Vertices contract still documents `Point[]` and `string[]`
([Vertices docs, lines 8–17](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/docs/docs/shapes/vertices.md#L8-L17)).

Therefore, do not label the supported array path an upstream anti-pattern and
do not retry buffer-backed Vertices without a supported official example or
contract. Instead, use the existing `current`, `no-blur`, and `paused` native
fixtures to determine separately:

- the cost of continuous mesh updates;
- the incremental cost of the blur layer; and
- the idle baseline.

If blur is proven expensive, test a lower sigma or a non-blurred art direction
as an explicit visual trade-off. If dynamic color construction dominates,
prototype a different supported renderer and compare screenshots before any
production replacement.

## Higher-scale or visual experiments

| Candidate | When it becomes appropriate | Why it is deferred now |
| --- | --- | --- |
| `Atlas` + `useRSXformBuffer` | A future game has hundreds of repeated textures or tiles. | The official performance case starts at 300 similar sprites; allocation has at most 17 visible live/frozen objects and unique progress/reveal behavior. |
| Coons `Patch` mesh | A new visual direction explicitly wants smooth patch gradients and accepts screenshot changes. | The Aurora example builds patch arrays and derived objects itself ([Coons patch example, lines 108–193](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Aurora/components/CoonsPatchMeshGradient.tsx#L108-L193)); it is not presented as a faster replacement for Vertices and would change the current appearance. |
| Picture/immediate-mode rendering | The number of commands changes every frame. | The current scene has fixed topology, the case Pictures are designed to solve does not apply, and per-frame recording adds work. |
| Runtime shaders | Profiling and art direction justify a custom pixel effect. | No current game rule or allocation rendering problem requires a shader. Shader adoption would add complexity rather than remove demonstrated work. |
| High-bit-depth Canvas | Physical devices show unacceptable gradient banding and profiling accepts the surface cost. | It is a visual-quality experiment, not a general performance optimization. |

## Avoided misreadings of the example repository

- `PerformanceCanvases` repeatedly mounts and unmounts up to 100 Canvases; it
  is a stress fixture, not guidance to split a scene
  ([source, lines 7–60](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Performance/PerformanceCanvases.tsx#L7-L60)).
- The performance route exports Atlas and comments out the many-Canvas and
  per-Rect alternatives
  ([route, lines 1–3](https://github.com/Shopify/react-native-skia/blob/923ac2c24c4f18455fbbde31488b819ccb22aa24/apps/example/src/Examples/Performance/index.ts#L1-L3)).
- The Matrix and Freeze examples show that retained-mode Skia can render many
  nodes; they do not prove that every inactive node or mapper is free.
- The Aurora and Vertices examples allocate arrays/objects in derived work.
  They validate supported techniques, not zero-allocation guarantees.

## Priority

1. Implement and physically validate a pausable allocation shimmer clock.
2. Consolidate the identical shimmer mapper and conditionally mount
   revealed-only derived work.
3. Run the existing native mesh benchmark and record the measurements.
4. Prototype grouped slot/scene render state only if mapper counts or frame
   evidence justify the larger change.
5. Keep Atlas, Pictures, shaders, Coons patches, and high-bit-depth rendering
   deferred until scale, profiling, or art direction creates a concrete need.
