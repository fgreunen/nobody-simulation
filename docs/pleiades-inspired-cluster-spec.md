# Replace all existing scenarios with a physically grounded open cluster

## Problem Statement

The observatory currently presents a few specially privileged, very massive stars alongside largely identical small stars. Scenario-specific colours and glow reinforce a visible split between primary bodies and ordinary stars. The user wants a continuous, physically meaningful stellar population and a deliberately tuned setup that approximates a plausible system in space.

The existing fifteen-scenario collection no longer represents the intended product. A collection of visually dramatic starting arrangements is insufficient: the new experience must explain what its bodies represent, why their properties differ, and how its distances and elapsed time relate to their motion.

## Solution

Replace every existing scenario with one curated, Pleiades-inspired smaller open cluster. The default scene contains 100 mutually gravitating bodies, has a one-parsec three-dimensional half-mass radius, and represents a population at approximately 125 million years. These are the analogue's own parameters, not claims to reproduce the actual Pleiades.

Generate a continuous, low-mass-weighted population spanning approximately 0.08–5 solar masses. Use age-dependent stellar models to obtain mutually consistent radius, temperature, luminosity, and evolutionary identity. Include pre-main-sequence stars where the reference age requires them. Keep evolutionary identity and intrinsic properties fixed during ordinary playback; simplified mergers are the explicit exception.

Give the cluster a physically coherent spatial and velocity distribution near equilibrium. Select and tune a reproducible default realization. Generated variations follow the same structural recipe and physical constraints. All subsequent motion follows the gravity model, without scripted trajectories or forces that maintain an attractive composition.

Use physically calibrated units throughout. Apply separate, consistent display adjustments to stellar size and brightness so bodies remain visible. Display enlargement must never enlarge a physical collision cross-section. Selecting a star reveals its physical properties while retaining camera following.

## User Stories

1. As an observer, I want one carefully composed open-cluster scene, so that I can explore a coherent physical setup.
2. As an observer, I want the former scenario collection removed, so that the interface reflects the new design.
3. As an observer, I want every gravitating body to contribute and respond to gravity, so that the cluster's motion comes from the whole population.
4. As an observer, I want no designated central star, so that the experience does not impose a sun-and-followers arrangement.
5. As an observer, I want a continuous range of stellar masses and radii, so that bodies do not fall into artificial large and small tiers.
6. As an observer, I want low-mass stars to be common and high-mass stars rarer, so that the population has a plausible distribution.
7. As an observer, I want occasional larger stars to emerge from that distribution, so that variation is natural rather than a privileged visual category.
8. As an observer, I want a common reference age, so that the population's stellar properties describe a coherent snapshot.
9. As an observer, I want contracting low-mass stars identified appropriately, so that immature bodies are not misrepresented as mature main-sequence stars.
10. As an observer, I want mass, radius, temperature, and luminosity to agree, so that each body's appearance has a physical explanation.
11. As an observer, I want stellar colour to express temperature, so that colour has a consistent meaning.
12. As an observer, I want continuous changes across descriptive subtype boundaries, so that a label change does not produce a size or colour jump.
13. As an observer, I want smaller and fainter stars to remain visible, so that the whole population can be explored.
14. As an observer, I want visibility adjustments explained, so that displayed diameters are not mistaken for literal astronomical scale.
15. As an observer, I want selection distinguished from stellar colour, so that highlighting does not obscure temperature information.
16. As an observer, I want to select and follow an individual star, so that I can examine its motion within the cluster.
17. As an observer, I want an inspector showing category, mass, physical radius, surface temperature, and luminosity, so that differences between bodies are understandable.
18. As an observer, I want the default cluster to begin near equilibrium, so that it does not undergo an unintended immediate collapse or dispersal.
19. As an observer, I want encounters and escapes to emerge from gravity, so that interesting events are outcomes rather than staged requirements.
20. As an observer, I want a repeatable curated default, so that opening the observatory gives me the intended experience.
21. As an observer, I want controlled generated variations, so that I can explore different realizations of the same kind of cluster.
22. As an observer, I want Reset to restore the current scene's exact initial state, so that I can repeat an observation.
23. As an observer, I want to adjust body count and cluster extent, so that I can investigate their effect on the cluster.
24. As an observer, I want pending scene edits applied through Generate, so that adjusting settings does not unexpectedly change the running scene.
25. As an observer, I want total mass calculated from the generated population, so that stellar properties are not invalidated by arbitrary mass rescaling.
26. As an observer, I want physical units for masses, distances, stellar properties, and elapsed time, so that the scene has an interpretable scale.
27. As an observer, I want accelerated playback with the actual years-per-second rate visible, so that slow astronomical motion remains watchable.
28. As an observer, I want achieved simulation speed reported when computation falls behind, so that the display does not claim time advancement that did not occur.
29. As an observer, I want pause and camera exploration retained, so that I can inspect a scene independently of its motion.
30. As an observer, I want overlapping displayed glows to leave physical bodies separate, so that visual enlargement does not cause false mergers.
31. As an observer, I want a physical surface intersection to use a documented merger approximation, so that the event has understandable consequences.
32. As an observer, I want following and inspection to transfer to a surviving remnant, so that a merger does not lose the selected object.
33. As an observer, I want Reset to restore original bodies and clear merger effects, so that the initial population is recoverable.
34. As an observer, I want the reference cluster and modelling limitations explained, so that an illustrative analogue is not mistaken for a reconstruction or prediction.
35. As a future contributor, I want a body catalogue describing category-specific attributes and relationships, so that additional celestial bodies can be introduced without reusing inappropriate stellar rules.
36. As a maintainer, I want numerical verification without rendering, so that the model can be checked quickly and reproducibly.
37. As the project owner, I want work to remain local, so that implementing the design does not publish or deploy it.

## Implementation Decisions

- Remove the existing scenario recipes, scenario selector, obsolete scenario-specific settings, primary-body privileges, and associated scenario assumptions. Do not merely hide the previous scenarios. Replace obsolete tests and documentation while retaining coverage of behaviour that remains relevant.
- Preserve the established distinction between gravitating bodies and tracer particles. Every simulated star in this scene is a gravitating body. Static background decoration is not part of the stellar population. Adding tracers is not part of this work.
- Use the Pleiades as observational guidance for an open-cluster model. Name the scene as a smaller Pleiades-inspired analogue. The actual cluster's membership, extent, encounter rates, relaxation, and evolution must not be attributed to the 100-body analogue.
- Default to 100 initial bodies and a one-parsec three-dimensional half-mass radius. This means half the generated stellar mass lies within that radius; it is not a core radius, projected radius, or hard outer boundary. Any finite sampling boundary is an initial-condition choice, not a physical wall.
- Use a reference population age of approximately 125 million years and initial stellar masses of approximately 0.08–5 solar masses. These supersede the earlier proposed 0.08–10 solar-mass young, entirely main-sequence population.
- Sample a continuous low-mass-weighted distribution. A truncated Kroupa-like distribution is a permissible documented approximation, not a measurement of the present-day Pleiades mass function. The curated realization must be representative of the recipe rather than artificially guaranteed to contain a spectacular massive star.
- Source age-dependent stellar attributes from a documented published model or isochrone covering the chosen age and mass interval. Bundle the required data and attribution locally. Independent random sampling of mass, radius, temperature, and luminosity is prohibited. Verify interpolation and luminosity consistency, including the pre-main-sequence region.
- Assign descriptive labels after deriving properties. Category boundaries must not create artificial discontinuities in continuously varying physical attributes.
- Represent evolutionary identity separately from continuous physical attributes. Freeze age and stellar evolution during ordinary playback; elapsed dynamical time is not a claim to evolve stellar interiors. Re-evaluate remnant attributes under the documented merger approximation.
- Describe the broader catalogue in project documentation: pre-main-sequence stars, main-sequence stars, evolved stars, white dwarfs, neutron stars, black holes, brown dwarfs, planets, and smaller bodies. Record meaningful input attributes, supported ranges, generation distributions, dependencies, units, provenance, and limits. Only the first two kinds populate this scene. Avoid presenting scoped model ranges as universal astronomical boundaries.
- Keep body kind distinct from descriptive subtype and orbital role. For example, a moon is an orbital relationship, and a black-hole horizon is not a stellar surface with a surface temperature.
- Extend the existing numerical-state and scene-generation boundary to own physical properties and calibrated units. Rendering and inspection consume that state rather than maintaining separate physical models. Keep the existing camera and UI coordination responsibilities.
- Maintain a small, explicit conversion between internal solver units and physical units. Convert masses, distances, velocities, gravity, stellar radii, and elapsed time consistently. Internal normalization remains acceptable; arbitrary independent mass or radius scaling does not.
- Body count and cluster extent are initial scene controls. Total initial mass is the sum of generated stellar masses and is read-only. Remove the independent total-mass control. Preserve staged settings applied by Generate. Supported control bounds must be documented and checked rather than promising that any arbitrary configuration remains a plausible tuned cluster.
- Use a seeded, approximately spherical equilibrium phase-space recipe, such as an isotropic Plummer model, with a documented finite sampling treatment. Account for actual generated masses, remove bulk centre-of-mass motion, and tune velocities against the force model actually used. A global virial ratio near one half alone is not proof of equilibrium.
- Select a fixed default seed and review its initial structure and evolution. Generation produces repeatable seed-based variations constrained by the same physical recipe. Reset restores an independent copy of the current realization's initial properties, motion, identities, and merger state.
- Retain CPU double-precision direct gravitational summation and leapfrog integration as the baseline, with WebGPU for rendering. Choose and justify timestep and any force softening against the new physical scales. Do not carry over the former scene-relative softening or collision radii without evaluating their consequences. Resolving close encounters accurately is not guaranteed by changing unit labels.
- Use a characteristic gravitational timescale computed from the current realization's mass and half-mass radius. Normal requested playback advances approximately one such timescale per real minute. State the timescale convention and show elapsed simulated years plus requested/achieved years per second as appropriate.
- Preserve the bounded simulation clock and lifecycle handling. Overload slows achieved time rather than silently increasing integration error or accumulating hidden-page backlog. This follows the existing numerical-stability decision.
- Separate physical radius, physical collision radius, displayed radius, and picking affordance. Collision radius represents the stellar surface for this model. Display scaling and selection hit areas must not affect forces or merger detection.
- Use one consistent, continuous display mapping for all stars. Temperature determines colour; luminosity informs a compressed brightness mapping; stellar radius informs displayed core size. A visibility floor and restrained glow are acceptable. Remove scenario/group colours and primary-body-specific glow rules. Use a separate selection marker.
- Retain a documented simplified merger for physical surface intersections, including fast crossings between steps. Account for retained mass, any modelled loss, centre of mass, momentum, identity transfer, and reset. Recalculate remnant attributes; generation's upper mass bound must not silently clamp remnant mass or force unsupported table extrapolation. Document the limited remnant prescription rather than claiming detailed collision or stellar-evolution modelling.
- Preserve applicable camera capabilities, pause, playback speed, recentering, and cinematic viewing. Frame the cluster rather than a privileged primary. Selection and following must resolve surviving identities after mergers.
- Add the selected-body inspector with category, mass, physical radius, surface temperature, and luminosity in labelled units. Explain age freezing, display enlargement, and the analogue's modelling limits in concise product language.
- Preserve the existing fixed 1280×720 WebGPU rendering baseline and unsupported-device handling. Bundle runtime dependencies and stellar-model data; do not introduce runtime service requests.
- Update current behaviour documentation and glossary entries for the new design. Document the body catalogue and any refinement of numerical-model assumptions. Respect the existing CPU-physics, WebGPU, stability, and gravitating-body distinctions. Historical notes remain historical, not active scenario support.

## Testing Decisions

- Make deterministic numerical unit and integration tests the primary acceptance route. The user explicitly prefers tests of the numerics without visualization because browser tests are expensive.
- Reuse the existing pure scene-generation, state-cloning, force, integration, merger, and clock interfaces. Prefer integration tests that generate a scene, advance it, and examine observable physical outputs over tests of private helper structure. Do not create a new general testing abstraction when the existing boundary suffices.
- Prior art includes the existing numerical tests for orbital integration, energy, seeded generation, merger accounting, swept crossings, independent resets, finite states, and bounded time advancement. Reuse relevant patterns while removing assumptions about obsolete presets and equal-density stellar radii.
- Test deterministic generation, the curated default, mass bounds and distribution behaviour across a fixed seed ensemble, total-mass accounting, zero bulk motion, the defined half-mass radius, and finite initial state. Statistical checks must be reproducible and must not require every 100-star realization to contain a high-mass member.
- Test age-dependent physical attributes against independent source-data anchors. Include low-mass pre-main-sequence cases, supported interpolation boundaries, continuous behaviour, category assignment, and consistency of radius, temperature, and luminosity. Do not test interpolation by duplicating its implementation as the expected answer.
- Test conversion round trips and physical scaling through observable behaviour: acceleration, a controlled two-body orbit, and the relation between cluster size, mass, and characteristic time. Test requested and achieved playback rates independently of rendering.
- Test a generated near-equilibrium cluster over several characteristic times, using defined metrics for half-mass-radius evolution, energy drift, centre-of-mass drift, bound population, and finite state. Record the measurement horizon and justified tolerances before evaluating the curated seed. Use timestep-convergence comparisons and analytical control cases to distinguish numerical error from genuine few-body encounters or finite-population evolution. Do not demand that the cluster remain perfectly unchanged.
- Cover multiple deterministic variation seeds as well as the hand-selected default, so tuning cannot conceal a generally unsuitable recipe.
- Test that changes to display scaling, glow, or picking leave physics and collision outcomes unchanged. Test nonmerging physical separation despite overlapping displayed sizes, actual physical contact, swept crossings, remnant accounting and attributes, survivor resolution, and exact reset.
- Test body-property inspection and selection-state projection without rendering wherever practical. Keep only essential browser coverage for visible inspector wiring, retained interactions, removal of obsolete scenario UI, and WebGPU initialization/failure behaviour. Do not route numerical assertions through browser snapshots or build a broad new visual suite.
- Existing browser prior art provides observatory snapshots, body projection, controlled state setup, camera following, pause/reset, lifecycle, and WebGPU handling. Reuse its bounded test interfaces only where browser verification adds evidence unavailable below the UI. Inspection helpers remain development/test-only.
- Record visual review of the curated default as a separate design check: no binary size tiers, no privileged central glow, readable temperature colours, restrained halos, inspectable small bodies, and useful cluster framing. Visual review does not replace numerical evidence.
- During implementation, run focused numerical checks first. Complete the repository's required full verification gate once at completion, including applicable retained browser checks, with the source fixed during verification. Repeat only checks affected by subsequent changes. Larger body counts and performance targets require measured evidence rather than inference from the 100-body default.
- Testing-seam status: the user requested numerical unit/integration priority in response to the proposed browser-led approach; this section incorporates that correction.

## Out of Scope

- Retaining, hiding, or extending the previous scenario collection.
- A star-by-star Pleiades reconstruction or a prediction of its actual future.
- Claims that 100 stars reproduce the real cluster's relaxation, encounter frequency, binaries, tidal evaporation, or membership history.
- Populating the scene with evolved stars, remnants, brown dwarfs, planets, or smaller bodies. Those kinds receive catalogue descriptions only.
- Stellar ageing during playback, star formation, supernovae, gas dynamics, or a full stellar-interior model.
- Detailed hydrodynamic or relativistic stellar collisions and calibrated merger radiation.
- A Galactic tidal field, residual gas potential, or external cloud encounters in this first isolated internal-dynamics model.
- Scripted close encounters, artificial confinement, trajectory steering, or guaranteed spectacular events.
- GPU gravitational computation, tracer populations, a new general scenario framework, saving, and unrelated interventions.
- Universal literal display scale, uncompressed astrophysical brightness, broad new browser suites, or new performance guarantees at larger populations.
- Hosting changes, deployment, publication of the site, or pushing repository changes.

## Further Notes

The conversation's final accepted reference is a smaller Pleiades-inspired analogue with a one-parsec half-mass radius. Later research suggested a two-parsec alternative, but the user did not adopt it; do not silently substitute that suggestion. The initial 10-solar-mass upper limit and entirely main-sequence young-population proposal were explicitly superseded.

Research references:

- [Open-cluster research compilation, Table 4](https://www.aanda.org/articles/aa/pdf/2024/09/aa49791-24.pdf): Pleiades reference membership, mass, age, and half-mass radius. Distinguish three-dimensional, projected, core, and tidal radii when using observational inputs.
- [Pleiades stellar ages and isochrone comparison](https://doi.org/10.1051/0004-6361/202346790): approximately 100–125 million years and age-dependent stellar modelling.
- [Pleiades spatial distribution](https://doi.org/10.1051/0004-6361/201731996): measured structural properties depend on membership and model assumptions.
- [Kroupa stellar mass-function discussion](https://arxiv.org/abs/astro-ph/0011328): support for a low-mass-weighted birth-distribution approximation, not proof of an observed present-day analogue population.
- [Pecaut and Mamajek dwarf sequence](https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt): useful mature-dwarf reference checks; it is not sufficient by itself for the agreed age-dependent pre-main-sequence population.
- [IC 348 kinematic study](https://arxiv.org/abs/1505.07504): explains why a much younger embedded cluster was not selected as the simple isolated equilibrium reference.

Publication status: local issue-ready draft. No project issue tracker, tracker destination, or configured triage vocabulary was found, and the repository reports no Git remote. Run `/setup-matt-pocock-skills` to configure these. Once configured, publish this specification with the `ready-for-agent` label; this label is publication metadata, not a claim that implementation is complete.
