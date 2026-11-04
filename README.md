# NOBODY — Stellar Observatory

A browser-only, three-dimensional orbital simulation: 100 mutually gravitating bodies, a cinematic WebGPU view, and mouse/trackpad exploration.

## Run locally

Requires Node.js 24+ and an up-to-date Chrome or Edge browser with working WebGPU and graphics acceleration. Use localhost or HTTPS; opening `index.html` directly is not supported.

```powershell
npm ci
npm run dev -- --port 5187
```

Open the printed local URL. For a production build:

```powershell
npm run build
npm run preview -- --port 5188
```

The `dist` directory is a static website. All simulation runs in the browser. Dependencies, styles, procedural textures, and background stars are bundled or generated locally; the application makes no runtime service requests. The hosted Site is private.

## Explore

- Left-drag to orbit; scroll or pinch to zoom.
- Right-drag or Shift-drag to pan. Panning releases body following.
- Click a star to follow it; orbit and zoom retain the selected body.
- Recenter restores the main-system view; Cinematic resumes automatic viewing.
- Pause freezes physics while the camera remains usable. Time ranges from 0.25× to 4×.
- Scene sliders are staged until Generate scene. Generate creates a fresh random arrangement and starts it running.
- Reset restores the current scene's exact initial positions and velocities, resets the camera, and pauses. Pending slider edits remain staged.

## Physics and rendering

Physics is independent of Three.js: Float64 arrays, pairwise softened Newtonian gravity with `G = 1`, and fixed-step kick–drift–kick leapfrog. The dominant star moves freely. Count changes preserve total scene mass. Scene radius, mass, and motion use relative units, not calibrated astronomical measurements.

At the default scale, a representative orbit takes approximately 45 real seconds. Per-frame physics work is capped at 64 steps or 8 ms. Overload slows achieved simulation time instead of increasing timestep size or degrading visual quality. Hidden-document and lifecycle events discard elapsed-time backlog.

Rendering is fixed at 1280×720 and pixel ratio 1, including the bloom pipeline, then fitted to the window without changing aspect ratio. UI text remains native-resolution. Glows, star colors/sizes, trails, and static background scenery are artistic representations. Background stars do not contribute gravity. There are no tracer particles, collisions, absorbing bodies, or physical walls.

This is a visual simulation, not a scientific prediction tool. Softening deliberately changes short-range forces, and timestep accuracy has finite limits. The isolated two-body energy test is a numerical regression check, not a guarantee for every many-body configuration. Direct summation costs O(N²); counts above 100 and GPU physics require a later measured scaling iteration.

## Verify

```powershell
npm test
npm run test:browser
```

The browser suite uses installed Chrome and starts/reuses the dev server on port 5187. It checks interaction behavior, reset, camera gestures, WebGPU failure and device loss. Visibility handling is tested by injecting browser visibility state/events, since automated Chrome can keep background pages visible.

With the production preview running on port 5188, run:

```powershell
npm run benchmark
```

This opens visible Chrome, warms up for 10 seconds, measures 60 seconds with the default 100 bodies and all effects, writes `docs/benchmark.json`, and exits unsuccessfully if average FPS is below 30 or achieved simulation speed differs from normal by more than 5%. Keep the benchmark browser open. `BENCHMARK_URL` can target another build of the same app.

## Project structure

- `src/physics.ts`: deterministic generation, numerical state, integration, bounded simulation clock.
- `src/universe.ts`: WebGPU initialization, stellar visuals, trails, post-processing, picking.
- `src/camera.ts`: orbit, pan, cinematic framing, and body following.
- `src/main.ts`: UI and lifecycle coordination; `src/style.css`: presentation.
- `tests`: numerical and browser acceptance checks.
- `docs`: design, decisions, laptop capability evidence, and benchmark results.

Saving, additional presets, gravity wells, tracers, other cosmic events, and larger population targets are deferred.
