# NOBODY — Stellar Observatory

A browser-only, three-dimensional stellar observatory. The default open cluster is a smaller Pleiades-inspired analogue with 100 mutually gravitating stars by default, a 1 pc three-dimensional half-mass radius, and a frozen 125-million-year stellar population. It is an illustrative isolated model, not a Pleiades reconstruction or prediction.

## Run locally

Requires Node.js 24+ and an up-to-date Chrome or Edge with working WebGPU and graphics acceleration. Use localhost or HTTPS.

```powershell
npm ci
npm run dev -- --port 5187
```

For a production build, run `npm run build`, then `npm run preview -- --port 5188`. Everything runs locally in the browser. Dependencies and stellar-model data are bundled; there are no runtime service requests. Work stays local: publish, deploy, or push only on an explicit request.

## Explore

- Left-drag to orbit continuously through a full vertical revolution; scroll or pinch to zoom; right-drag or Shift-drag to pan.
- Click a star to inspect its category, descriptive spectral subtype, mass (M☉), physical radius (R☉), temperature (K), and luminosity (L☉), while following its motion. Orbit and zoom retain following; pan releases it. A white ring marks selection without recolouring the star.
- Recenter restores cluster framing. Cinematic resumes automatic viewing. The question-mark button explains gestures and supports keyboard activation.
- Pause freezes motion and merger flashes while the camera remains usable. Playback ranges from 1× to 100× in whole-number steps using a live slider.
- Body count (32–1,000) and 3D half-mass radius (0.5–2 pc) are staged until Generate scene. Generate produces a seed-based variation of the same structural recipe and starts playback. Total initial mass is calculated from the population and shown read-only.
- Reset restores an independent copy of the current realization's exact original motion, properties, identities, and merger state, resets the camera, and pauses. Pending control edits remain staged.

The initial half-mass radius encloses half the generated mass about its centre of mass; it is neither a projected radius nor a physical boundary. Default seed 125 is reproducible, without a guaranteed massive member. Count and extent bounds are supported inputs, not a guarantee of equilibrium for every realization. The 100-body default and two variation seeds have measured numerical evidence; larger populations have no new performance guarantee.

## Selectable scenarios

Choose a Scenario, then Generate scene. Selection, body count and radius are staged; Reset restores the active realization and leaves pending edits intact. All scenarios share gravity, enhanced merging, inspector and playback controls. Runaway intruder replaces one sampled star with an already-formed massive merger remnant; the other stars retain the frozen stellar population.

- **Open cluster** retains the original near-equilibrium Plummer recipe.
- **Cold collapse** starts with 20% of the equilibrium velocities, letting gravity draw the stars inward.
- **Expanding association** adds outward velocity proportional to distance from the centre.
- **Cluster smash** launches two compact stellar clumps into a fast, off-centre collision, with merger flashes and an expanding spray of survivors. At achieved 1×, the main encounter happens around 12 seconds after Generate; higher playback speeds bring it forward.
- **Runaway intruder** sends a blue-white merger remnant through a slow-moving cluster core, capturing stars, triggering flashes and leaving a scattered wake. The intruder starts with one third of the combined mass and reaches the core around 13 seconds at achieved 1×. Its properties use the same toy remnant approximation as new mergers.
- **Rotating cluster** adds a shared spin around the vertical axis.
- **Flattened cluster** starts with a compressed vertical extent, forming a thin stellar gathering.

The six alternatives are illustrative experiments, not observed systems or equilibrium models. Radius always means the combined initial three-dimensional half-mass radius, including the intruder where present. Their checks cover deterministic generation, physical scaling, zero bulk motion, finite evolution and mass accounting over one characteristic time for three 32-body seeds, plus short-horizon gravity convergence. The original five-timescale equilibrium evidence applies only to Open cluster; no new performance guarantee is made.

## Physical model and appearance

Masses follow a truncated, continuous Kroupa-like distribution from 0.08 to 4.5 M☉. The approximate 5 M☉ design limit is refined to 4.5 because the adopted 125 Myr MIST isochrone has evolved stars above the main-sequence turnoff (~4.56 M☉). Only pre-main-sequence and main-sequence stars are generated. Properties come from published MIST v1.2 and BHAC15 models; source anchors, attribution, interpolation and limits are [documented locally](data/README.md). Low-mass contracting stars retain their evolutionary identities. All interiors and the reference age stay fixed during playback, even as dynamical years advance. Mergers are the explicit exception.

Every star responds and contributes to gravity; none is designated central. For Open cluster, a seeded isotropic Plummer distribution function supplies positions and velocities, with a finite initial sampling limit. The actual masses determine the barycentric frame, half-mass scale and velocity normalization against the softened forces. There are no scripted trajectories, physical walls, gas, Galactic tides, primordial binaries, tracers, or forces that maintain the composition. Static background stars are decoration.

The CPU solver uses Float64 arrays, pairwise softened Newtonian gravity, and fixed-step kick–drift–kick leapfrog. Force softening is 0.001 initial half-mass radii (about 206 AU at default), and the timestep is one gravitational timescale divided by 8,192. Internal lengths are pc, masses M☉, and G=1; one internal time unit is ~14.91 million years. The gravitational timescale is `sqrt(r_half³ / (G M_initial))`. Normal playback requests one such timescale per real minute; elapsed years and requested/achieved yr/s are shown. With seed 125 this is ~2.188 Myr per minute (~36,466 yr/s). Overload slows achieved time: the clock caps work at 64 steps or 8 ms per frame and discards backlog, including on lifecycle/visibility changes. [Numerical assumptions and acceptance evidence](docs/cluster-validation.md) explain timestep and softening limits.

Temperature determines continuous warm-to-blue-white colour. Physical stellar radius informs a continuous enlarged core-size mapping with a visibility floor; luminosity informs compressed brightness with restrained glow. Displayed parsec-sized cores are vastly enlarged from true stellar surfaces. Picking uses a separate 14-screen-pixel affordance. None of these display choices affects gravity or collisions.

Close approaches now use **enhanced capture and immediate merging** to make events frequent. Each star has an effective capture radius `0.025 r_half (m / mean_initial_mass)^(1/3)`; stars merge when their combined capture radii overlap, including swept crossings between fixed steps. Two mean-mass stars in the default scene capture within 0.05 pc (~10,300 AU), vastly farther apart than their physical surfaces. The inspector distinguishes physical stellar radius from capture radius; the footer counts completed mergers. This artistic, dissipative rule replaces the earlier physical-contact-only requirement at the owner's request; it is not a model of real binary capture or stellar collision rates. It responds to distance, never a numerical-instability trigger. The remnant takes the combined centre of mass and velocity; a toy radiation rule removes 1% of twice the smaller mass. Radiation carries that fraction of momentum away at the common velocity. The survivor receives a separate, documented homology approximation for radius, luminosity and temperature, without extrapolating or clamping the age isochrone. Following and inspection transfer to the survivor; Reset restores the initial population and clears flashes. No binary inspiral is simulated: capture coalesces immediately and removes relative motion. Realistic collision rates, tight binaries and long-term relaxation are not claimed. Default seed 125 and variations 42 and 731 each produce six mergers over one characteristic time (one minute at achieved 1×), with first events at approximately 2.5, 3.4 and 12.9 seconds respectively. Actual wall time depends on achieved playback. Counts are measured examples, not scheduled events or guarantees for every seed.

WebGPU rendering remains fixed at 1280×720, pixel ratio 1, including bloom, fitted to the window with native-resolution UI. Unsupported devices and device loss have explicit recovery screens.

## Verify

```powershell
npm run -s check
```

The gate runs lint, numerical/unit tests, typechecked production build and essential browser tests. Results persist in `verification-results/`. Prefer focused `npm run -s` checks during iteration; keep source fixed during checks. See [verification](docs/verification.md) for commands and evidence. Numerical tests take priority over browser checks and include published data anchors, an analytic orbit, physical scaling, mass statistics, five-timescale equilibrium/convergence, mergers, resets, and bounded clocks.

`npm run benchmark` measures a separately running production preview on port 5188 for 60 seconds after 10 seconds warmup. It uses the current realization's physical rate. The retained `docs/benchmark.json` describes the previous model and is not performance evidence for this cluster.

## Project structure

- `src/physics.ts`: calibrated units, generation, numerical state, forces, integration, mergers, inspection projection and bounded clock.
- `src/stellar.ts`, `src/stellar-data.json`: immutable age-dependent stellar properties and the explicit merger approximation.
- `src/appearance.ts`, `src/universe.ts`: continuous display mapping, WebGPU visuals, trails and picking.
- `src/camera.ts`, `src/main.ts`, `src/style.css`: camera, UI and lifecycle coordination.
- `data/`: published model anchors and provenance; `scripts/prepare-stellar-data.py` rebuilds the bundled table offline.
- [Glossary](GLOSSARY.md), [body catalogue](docs/body-catalogue.md), [design](docs/design.md).

Saving, additional body populations, stellar ageing, external potentials, GPU gravity and larger-population performance work are deferred. The previous scenario collection remains removed; the new initial-condition scenarios are described below. Historical notes do not describe current support.
