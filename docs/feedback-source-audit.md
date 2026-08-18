# Feedback source audit

Audit date: 16 August 2026

This document checks the recommendation provenance behind the earlier comparison in
[`allocation-architecture.md`](./allocation-architecture.md) and the attached report at
`/Users/julienthomas/.codex/attachments/f69f72e7-6ff6-46f3-84a6-b7243fdf222e/pasted-text.txt`.
It does **not** reassess the current application implementation.

## Source reliability and scope

| Feedback source  | Audited evidence                                                                                                                                                                                                                                                                                                                                     | Reliability note                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopify examples | Local clone `/Users/julienthomas/Documents/react-native-skia` at commit `923ac2c24c4f18455fbbde31488b819ccb22aa24`                                                                                                                                                                                                                                   | Primary source code. Examples demonstrate patterns; they do not present an architecture checklist for this app.                                                                                                            |
| Medium article   | [Using React Native Skia to Build More Than Just SVGs](https://medium.com/@silverskytechnology/using-react-native-skia-to-build-more-than-just-svgs-a5bc1d6022c5)                                                                                                                                                                                    | Secondary article. Direct access returned 403, but the article's indexed content exposed all principal sections. Its performance claims and samples were not independently validated.                                      |
| LobeHub mirror   | [LobeHub listing](https://lobehub.com/skills/neversight-skills_feed-reanimated-skia-performance), [upstream `SKILL.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/SKILL.md), and [upstream references](https://github.com/andreev-danila/skills/tree/main/skills/reanimated-skia-performance/references) | Third-party guidance, not Shopify or Software Mansion guidance. The LobeHub download contained `SKILL.md` but omitted the four referenced files; the upstream repository supplies them. No installed local copy was found. |

The LobeHub package downloaded from
`https://market.lobehub.com/api/v1/skills/neversight-skills_feed-reanimated-skia-performance/download`
had SHA-256 `fa402e5682a61dd3904531502dd5af4ebf87f01e0751626541646ed23540915f`
at audit time.

## Feedback 1: Shopify repository examples

### What the examples directly demonstrate

1. A scene can contain many drawing nodes in one `Canvas`. The Matrix example renders a grid of symbols inside one canvas ([`Matrix.tsx`, lines 34–64](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Matrix/Matrix.tsx#L34)).
2. One clock can drive many descendants. `Matrix` creates one `useClock()` value and passes it to every symbol ([`Matrix.tsx`, lines 34–59](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Matrix/Matrix.tsx#L34)); each symbol derives glyph, opacity, and color from it ([`Symbol.tsx`, lines 35–63](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Matrix/Symbol.tsx#L35)).
3. Gesture-driven visual state can stay in shared values and feed Skia directly. The Hue example updates position/color shared values in the gesture callback and passes them to canvas nodes ([`Hue.tsx`, lines 38–72](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Hue/Hue.tsx#L38)).
4. JavaScript crossings can be deferred until a discrete completion. The Transitions example updates progress continuously in worklets, then calls `runOnJS` after the end animation ([`Transitions.tsx`, lines 69–108](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Transitions/Transitions.tsx#L69)). The drawing overlay similarly mutates its active path during the gesture and saves it on end ([`DrawingOverlay.tsx`, lines 61–106](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Chat/ChatScreen/DrawingOverlay.tsx#L61)).
5. `Atlas` plus `useRSXformBuffer` is demonstrated for hundreds of repeated sprites: the performance example starts at 300 boxes ([`Atlas.tsx`, lines 21–31 and 49–95](/Users/julienthomas/Documents/react-native-skia/apps/example/src/Examples/Performance/Atlas.tsx#L21)).
6. Buffer hooks preallocate mutable arrays. The library implementation memoizes the backing array and mutates its entries in a mapper; it exposes `useRSXformBuffer`, `usePointBuffer`, and `useColorBuffer` ([`buffers.ts`, lines 12–58](/Users/julienthomas/Documents/react-native-skia/packages/skia/src/external/reanimated/buffers.ts#L12)).
7. The cloned package defines `useClock` with a UI-thread frame callback ([`interpolators.ts`, lines 57–68](/Users/julienthomas/Documents/react-native-skia/packages/skia/src/external/reanimated/interpolators.ts#L57)).
8. The repository contains web smoke tests that load each API example, assert a canvas, capture screenshots, and reject page errors. The comments explicitly say these screenshots are **not** golden-image comparisons ([`web.spec.ts`, lines 10–16 and 56–79](/Users/julienthomas/Documents/react-native-skia/apps/example/e2e/web.spec.ts#L10)).
9. The cloned example app pins `@shopify/react-native-skia` `2.11.0` ([root `package.json`, line 42](/Users/julienthomas/Documents/react-native-skia/package.json#L42)).

### Audit of the earlier Feedback 1 list

| Earlier recommendation                                     | Source verdict                                                                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render all dots in one Canvas                              | **Supported as an adaptation**, not an explicit rule. The examples show complex single-canvas scenes.                                                     |
| Share one animation clock                                  | **Directly demonstrated** by Matrix.                                                                                                                      |
| Keep continuous state off JavaScript                       | **Directly demonstrated** by gesture/shared-value examples.                                                                                               |
| Remove per-frame scroll dispatches                         | **Supported as an adaptation**. Transitions keeps progress in worklets and crosses only at completion, but it does not discuss this app's scroll reducer. |
| Build a deeper allocation module                           | **Not from Shopify examples.** This is project architecture advice.                                                                                       |
| Separate model, gestures, renderer, and feedback           | **Not stated by the cited examples.** This is project architecture advice.                                                                                |
| Keep reducers deterministic                                | **Not from Shopify examples.**                                                                                                                            |
| Use Atlas only after profiling                             | **Partly supported.** Atlas is demonstrated for hundreds of repeated sprites; “only after profiling” is our prudence criterion, not repository wording.   |
| Add visual regression coverage                             | **Overstated.** The clone has screenshot-producing smoke tests, but explicitly does not compare golden images.                                            |
| Add touch-lifecycle tests                                  | **Not established by the cited examples.**                                                                                                                |
| Preserve the existing domain layer                         | **Not from Shopify examples.**                                                                                                                            |
| Avoid a generic game engine before game two                | **Not from Shopify examples.**                                                                                                                            |
| Match the upstream Skia version before adopting interfaces | **Reasonable compatibility practice**, but not a recommendation made by these examples. The clone's version is evidence only.                             |

Therefore the current `allocation-architecture.md` labels “deterministic reducer,” “deeper allocation module,” and “visual regression” as Shopify recommendations too strongly. They are decisions inspired by the broader review, not direct upstream prescriptions.

## Feedback 2: Medium article

### Full direct recommendation/use-case list

1. Use Skia for freehand/custom drawing instead of absolutely positioned Views; mutate the active path from gesture/shared state, commit a completed stroke at gesture end, and use quadratic Bézier segments for smoother ink.
2. Compose GPU-backed color and image filters for image editing; use clip paths for cropping and downscale/nearest-neighbor upscale for pixelation.
3. For a simple 2D game, use a Skia canvas and transforms, `useRSXformBuffer` for sprite batching, and Reanimated `useFrameCallback` as a tick loop.
4. Use SkSL runtime shaders for custom pixel effects such as glass, liquid, or ripple visuals; animate their uniforms with a clock.
5. For a voice/blob visual, put live microphone metering in a Reanimated shared value and derive shader uniforms from it.
6. Treat Skia as a specialized renderer, not a general UI framework. Keep forms, CRUD, settings, profiles, navigation, lists, and ordinary text/image UI in React Native; use lighter SVGs for static icons.
7. Use a hybrid screen: add a canvas only where custom drawing, data-heavy charts, pixel-level rendering, fluid animation, or GPU effects justify it.

Reliability caveat: the article's ripple sample appears malformed because it refers to `dist` before its declaration and duplicates `wave`. Its statement that the samples are “working code” should not be treated as verified.

### Audit of the earlier Feedback 2 list

| Earlier recommendation                                            | Source verdict                                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Specialized Skia rendering layer / hybrid screen                  | **Directly stated.** This is the article's main architectural recommendation.                                                           |
| Consolidate the game scene into one Canvas                        | **Adaptation, not direct wording.** The article uses one canvas per example but does not audit canvas count in this app.                |
| Keep rapidly changing positions/animation values in shared values | **Demonstrated** in the drawing/game/blob examples.                                                                                     |
| Transfer only semantic events to JavaScript                       | **Partly demonstrated** by committing a stroke at gesture end, but not stated as a general semantic-event architecture.                 |
| Keep game/session state in React or a reducer                     | **Not stated.**                                                                                                                         |
| Keep collision/per-frame simulation in a game-loop module         | **Not stated.** The article only shows a small inline frame callback.                                                                   |
| Use a frame callback only for genuine continuous work             | **Our corrective interpretation, not article wording.** The article presents a frame loop but gives no “only when” rule.                |
| Pause continuous animation when inactive                          | **Not stated.**                                                                                                                         |
| Use Atlas for many repeated objects                               | **Not stated as Atlas.** The article mentions sprite batching with `useRSXformBuffer`.                                                  |
| Use shaders for visual effects, not rules/ordinary UI             | **Visual-effects half is direct; prohibition on rules is our interpretation.**                                                          |
| Avoid frame-rate-dependent physics / use delta or fixed time      | **Not an article recommendation.** Its example actually applies fixed gravity per callback and is frame-rate dependent.                 |
| Do not copy the shader sample verbatim                            | **Audit correction**, warranted by the malformed sample, not advice from the author.                                                    |
| Add visual and interaction regression tests                       | **Not stated.**                                                                                                                         |
| Preserve accessibility outside Skia                               | **Not stated.** It follows from the hybrid architecture and platform accessibility needs, but should not be attributed to this article. |
| Keep state ownership explicit                                     | **Not stated.**                                                                                                                         |

The four Medium rows currently retained by `allocation-architecture.md` over-attribute frame-callback policy, reducer ownership, and accessibility to the article. Only the hybrid/specialized-renderer recommendation is direct; the others are good project decisions derived elsewhere.

## Feedback 3: LobeHub-mirrored third-party skill

### Full direct recommendation list

The following is deduplicated across the upstream [`SKILL.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/SKILL.md), [`reanimated-v4.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/references/reanimated-v4.md), [`skia-shaders.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/references/skia-shaders.md), [`perf-checklist.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/references/perf-checklist.md), and [`dev-tuning.md`](https://github.com/andreev-danila/skills/blob/main/skills/reanimated-skia-performance/references/dev-tuning.md).

1. Define what animates, its timing/curve, interruption rules, and gesture input before implementation.
2. Use Reanimated styles for transforms, opacity, and ordinary layout animation; use Skia for custom drawing, particles, gradients, runtime effects, and shaders.
3. Choose the appropriate primitive: CSS transitions for simple state changes, CSS keyframes for sequences, `withTiming` for tweens, `withSpring` for physical motion, `withDecay` for momentum, and Layout Animations for mount/unmount or layout changes.
4. Keep animation state/data flow on the UI thread with shared/derived values and worklets; do not call React `setState` each frame.
5. Prefer derived values over imperative side effects.
6. Minimize JS/UI crossings. Never call `runOnJS` or `scheduleOnRN` per frame or from gesture `onUpdate`; reserve crossings for unavoidable discrete side effects or completion.
7. Batch related shared-value writes in one worklet when possible.
8. Prefer `.get()`/`.set()` over `.value` in app code for React Compiler compatibility, and do not read shared values during React render.
9. Drive visuals through `useAnimatedStyle`, `useAnimatedProps`, or direct Skia animated props/uniforms.
10. Prefer transforms and other non-layout properties over `width`, `height`, `top`, and `left`; avoid per-frame layout invalidation.
11. Avoid large per-frame object, array, path, or image allocation.
12. Memoize heavy Skia objects: paths, paints, runtime effects, and images.
13. Keep the Skia scene graph shallow, group transforms, separate static and dynamic content, record static content as a picture/texture, and animate only the minimal dynamic layer.
14. Avoid reconstructing paths per frame.
15. For many points/items, reuse mutable buffer helpers such as `usePointBuffer` and `useRSXformBuffer`; update large numeric payloads in-place with `Float32Array` where appropriate.
16. Pass shared-value objects directly to Skia props/uniforms instead of passing `.value` or causing React rerenders.
17. Drive shader uniforms with `useDerivedValue` or Skia `useClock`; treat `useClock` as milliseconds since first frame.
18. Avoid or measure large-area blur, masks, layers/`saveLayer`, and overdraw; use Skia debug render timing when available.
19. Compile runtime effects once and handle compilation failure.
20. Supply every declared shader uniform; keep uniforms small and stable; normalize coordinates in the shader; avoid branching and unbounded loops.
21. Use `usePathInterpolation` only for compatible paths and `useVectorInterpolation` for point/anchor interpolation.
22. Diagnose jank by checking thread ownership, crossings, allocations, layout work, dev-only tooling, JS stalls, React renders, garbage collection, and expensive GPU work.
23. If useful, add a `__DEV__`-only tuning panel in a separate component. Store tunables in shared values, feed shader tunables through derived uniforms, and deliberately restart config-based animations—prefer completion/restart controls over restarting on every slider tick.
24. Perform a dedicated performance pass after implementation.

### Audit of the earlier Feedback 3 list

| Earlier recommendation                               | Source verdict                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Remove scroll-to-JavaScript hot-path crossings       | **Directly supported** by the general no-per-frame-crossing rule; scroll is the app-specific application.                                       |
| Keep gesture updates on the UI thread                | **Directly supported.**                                                                                                                         |
| Preserve the Android gesture lifecycle               | **Not in the skill.** This is project/platform correctness advice.                                                                              |
| Use transforms instead of animated layout properties | **Directly supported by the upstream performance checklist.** Note: that referenced file is absent from the LobeHub download itself.            |
| Consolidate live and frozen dots / one Canvas        | **Not stated.** Scene shallowness supports the direction, but exact canvas consolidation is project-specific.                                   |
| Assemble one reveal snapshot on the UI thread        | **Project-specific interpretation**, supported only by the general single-UI-thread-data-flow rule.                                             |
| Allocate teams on JavaScript                         | **Not stated.**                                                                                                                                 |
| Apply assignments in one UI-thread update            | **Partly supported** by “batch related writes”; the exact assignment design is project-specific.                                                |
| Avoid repeated JavaScript reads during reveal        | **Supported in principle** by keeping hot state on the UI thread and avoiding render-time shared-value reads.                                   |
| Replace mesh arrays with `usePointBuffer`            | **Directly supported by the upstream shader reference**, but that file is absent from the LobeHub download.                                     |
| Replace color arrays with `useColorBuffer`           | **Not named in this skill or its references.** It is available in Shopify's buffer implementation, but attribution to this skill is too strong. |
| Measure full-screen blur                             | **Directly supported** by the heavy-effect/performance-pass guidance.                                                                           |
| Reduce blur or frequency on weak devices             | **Not stated.** This is a possible response to profiling evidence.                                                                              |
| Pause the mesh clock when unfocused/inactive         | **Not stated.**                                                                                                                                 |
| Standardize `.get()`/`.set()`                        | **Directly stated.**                                                                                                                            |
| Optimize smaller layout animations with transforms   | **Directly supported.**                                                                                                                         |
| Add a development-only tuning panel                  | **Directly stated.**                                                                                                                            |
| Keep audio/haptic crossings discrete                 | **Supported as an application** of unavoidable-side-effect crossings; audio/haptics are not named.                                              |
| Memoize artwork geometry                             | **Directly supported** by memoizing paths/heavy Skia objects.                                                                                   |
| Keep ordinary UI out of Skia                         | **Not stated by this skill.** This comes directly from the Medium article.                                                                      |

The current `allocation-architecture.md` third-party rows are mostly reasonable applications, but “Android pointer cleanup,” “atomic assignment,” and the mesh-buffer experiment are project-specific conclusions. They should not be presented as literal skill recommendations. The strongest direct skill items are UI-thread state, minimized crossings, batched writes, transform-based animation, reuse/memoization, heavy-effect profiling, and `.get()`/`.set()`.

## Correct attribution summary

| Theme                                                                | Best source attribution                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Hybrid React Native UI plus selective Skia canvas                    | Medium article                                                                                     |
| One clock drives many canvas nodes                                   | Shopify Matrix example                                                                             |
| Gesture/shared-value visual updates on UI thread                     | Shopify examples and third-party skill                                                             |
| Discrete rather than per-frame JS crossings                          | Shopify examples demonstrate it; third-party skill states it                                       |
| Transform rather than layout animation                               | Third-party skill's upstream performance checklist                                                 |
| Buffer reuse for many points/sprites                                 | Shopify source and third-party upstream shader reference                                           |
| Atlas for hundreds of repeated sprites                               | Shopify Atlas performance example                                                                  |
| Memoize Skia geometry/runtime effects                                | Third-party skill                                                                                  |
| Profile large blur/masks/layers                                      | Third-party skill                                                                                  |
| `.get()`/`.set()` convention                                         | Third-party skill                                                                                  |
| Deterministic reducer, deeper allocation module, domain preservation | Project architecture review, not any of the three named sources                                    |
| Accessibility layer outside Skia                                     | Project accessibility decision inferred from hybrid architecture, not direct named-source guidance |
| Android pointer cleanup and lifecycle                                | Project/platform correctness work, not direct named-source guidance                                |
| Visual golden regression                                             | Project testing decision; Shopify clone has screenshot smoke tests, not golden comparison          |
| Pause animation when inactive                                        | Project lifecycle/performance decision, not direct named-source guidance                           |

## Recommended documentation correction

Keep implementation status in `allocation-architecture.md`, but rename its first column from “Source and recommendation” to “Origin and applied decision,” and mark each row as one of:

- **Direct** — stated or directly demonstrated by the source;
- **Adapted** — a project-specific application of a source pattern;
- **Project review** — valuable advice that did not originate in the named source.

That preserves the useful implementation overview without implying that Shopify, the Medium author, or the third-party skill prescribed app-specific reducer, accessibility, pointer-lifecycle, or testing designs.
