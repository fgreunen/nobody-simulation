# Verification

Run `npm ci` after checkout, then `npm run -s check`. The completion gate runs lint, unit/integration tests, a typechecked production build, and essential browser tests, stopping at the first failure. Keep source fixed during checks and rerun affected checks after changes.

Standard commands print concise summaries; `-- --verbose` streams full output. Logs persist as `verification-results/<command>.{log,json}` (colons become hyphens). Inspect failure summaries before bounded log sections. A running report without `finishedAt` is not passed. The gate uses `check.{log,json}`; targeted checks preserve that report. CI runs the same gate and saves artifacts.

```powershell
npm run -s lint
npm run -s typecheck
npm test -s -- tests/physics.test.ts
npm test -s -- tests/stellar.test.ts
npm run -s test:browser
```

## Primary numerical acceptance

Pure numerical checks exercise deterministic seed generation, low-mass-weighted population statistics across 32 seeds, exact weighted half-mass radius, total mass and barycentric motion, physical-unit round trips and calibrated acceleration, an analytical unsoftened two-body orbit with convergence, age-dependent source anchors, continuous stellar properties/appearance, physical contacts and swept crossings, merger momentum/radiation accounting, unsupported-range avoidance, remnant attributes, identity resolution, independent reset and bounded clock advancement.

[Cluster acceptance protocol](cluster-validation.md) records limits declared before examining the curated seed. Default seed 125 and variations 42 and 731 evolve five gravitational times with quarter-time samples and repeat at half timestep. The machine-readable output is `verification-results/cluster-evolution.json`. Conservative gravity control (`encounterRadiusScale=0`) results: default horizon 10.94 Myr, half-mass radius 0.894–1.052 pc, maximum relative energy drift 3.49e-7 (half-step 8.72e-8), at least 99% individually bound, centre drift below 4e-15 pc. Across all three seeds and both resolutions: radius 0.894–1.192 pc, bound fraction at least 99%, largest full-step relative energy drift 7.93e-7. These measurements use ε=0.001 half-mass radii and timestep t_grav/8192; full/half-step final radii agree within 3.3%. Half-step convergence supports the large-scale evolution. These checks are not evidence for realistic stellar collision rates or unsoftened close encounters.

Enhanced-merger tests separately verify distance-based capture, mass/extent scaling, swept encounters, physical/display independence, identity/reset and mass accounting. The 100-body default and seeds 42/731 each produce six mergers in one characteristic time; first events occur at 2.50/3.44/12.91 normal-playback seconds. Results persist in `verification-results/enhanced-mergers.json`. Actual elapsed wall time follows achieved playback. The enlarged capture radius is an artistic approximation, not a measured physical stellar cross-section.

## Essential browser acceptance and visual review

The browser suite builds an isolated `.test-dist` bundle and serves port 5190 without reloads or server reuse. Inspection helpers are test/development-only. Installed Chrome with working WebGPU is required; CI can use software WebGPU for function but not performance claims.

Nine desktop checks cover an unforced default merger with a visible flash, visible physical/capture radius inspector fields and selection/survivor transfer, removal of scenario UI, staged generation/reset, continuous pole-crossing camera orbit, zoom/pan and playback slider through 100×, fixed 1280×720 initialization, unsupported WebGPU, device loss, and visibility/backlog handling. Numerical assertions stay below rendering. Visibility is injected because automated Chrome may keep background pages visible.

Visual review on 2026-11-05 inspected `curated-cluster.png` and `stellar-inspector.png` from the browser artifacts: smooth size/brightness variation, no privileged central halo, warm red through blue-white temperature colours, restrained glows, readable physical-property labels and a separate white selection outline. The central population fits the frame with diffuse outliers; small members remain visible and a sub-solar star was successfully selected. Some outer members extend beyond the initial frame, consistent with the finite Plummer outskirts. Browser verification targets desktop PCs; mobile layouts are not tested. Visual review is design evidence, not numerical validation.

## Performance

No new hardware benchmark has been run. `docs/benchmark.json` is legacy evidence for the previous model. The benchmark script now uses the current realization's requested physical rate. With a production preview on 5188, `npm run benchmark` warms visible Chrome for 10 seconds, measures 60 seconds, and checks >=30 FPS and normal achieved rate within 5%. Larger populations require separate measurement.

Historical scenario results remain in `history/`; they are not current supported behaviour.


## Additional scenarios

`tests/scenarios.test.ts` verifies unchanged Open cluster output, deterministic alternative recipes, retained stellar properties, combined half-mass radius, length/velocity scaling and barycentric initial conditions. Seeds 125, 42 and 731 at 32 bodies evolve one characteristic time with finite-state and retained-plus-radiated mass checks. A gravity-only control compares full and half timesteps over an initial eighth-timescale, requiring relative energy drift and maximum position disagreement below 1e-4. A separate 100-body control checks the initial contraction, expansion and approaching group centres. These are bounded numerical checks, not long-term equilibrium or performance evidence. Browser coverage exercises staged selection, generation, active labels and exact reset for each alternative, including preserved pending selection.

Rotating cluster and Flattened cluster participate in the same numerical and browser scenario checks. Additional three-seed checks verify added vertical angular momentum, the flattened vertical-to-planar extent ratio, and freshly computed accelerations for the compressed positions.

Cluster smash additionally checks three 100-body seeds for distinct incoming clumps with a nonzero impact offset, contraction below 0.6 initial half-mass radii by a quarter characteristic time (15 achieved 1× seconds), at least five mergers by half a characteristic time, and expansion beyond twice the initial half-mass radius by one characteristic time. Finite-state and mass accounting checks cover that aftermath. A deterministic browser run selects Cluster smash by name, verifies live merger flashes, and captures incoming, impact and aftermath screenshots at 3× playback.
