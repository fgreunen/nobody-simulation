# Historical verification records

Earlier runs only; use [current verification](../verification.md) and its saved artifacts for the current checkout.

### First-version verification

## Automated checks

- TypeScript checking and Vite production build succeed.
- Seven numerical tests pass: deterministic generation/reset, total-mass preservation, symmetric forces, freely moving central body, finite close encounters, render-rate independence, bounded stepping, invalid-input rejection, and isolated two-body stability.
- The two-body test runs 100 periods and requires maximum relative energy deviation below 0.1% with center drift below 1e-10 normalized units.
- Six installed-Chrome browser tests pass: fixed 720p rendering, staged generation and exact state reset, playback/camera interactions, unsupported WebGPU, device loss/reload UI, and hidden-document recovery.
- Visibility recovery uses injected document visibility state/events because automated Chrome can keep background pages visible. It tests the application event boundary, not Chrome's native background-tab policy.

## Visual review

Reviewed actual rendered Chrome screenshots with 100 moving bodies, short trails, halos, bloom, procedural background stars, readable scene controls, and camera status. Rendering stays at 1280×720 with native-resolution HTML controls.

## Laptop performance

The full recorded run used the Intel gen-12lp hardware adapter (not a software fallback), Chrome 156.0.8078.80, 100 bodies, fixed 720p, all effects, and a 10-second warm-up followed by approximately 60 seconds of foreground measurement. It observed 59.95 FPS and achieved simulation speed 0.99999× with no page errors. Raw evidence is in `benchmark.json`.

The strict benchmark result remains false because the camera switched to manual during that run. A subsequent input-locked cinematic run observed approximately 60 FPS through 30 seconds but was interrupted before completion. The user said “Assume it's fine” and authorized accepting the existing performance evidence instead of repeating or gating delivery on that benchmark. No visual effects or body counts were reduced.


## Two-preset local follow-up

The production build and 10 numerical tests pass after adding Cluster encounter. Encounter checks cover deterministic generation, equal stellar masses, total mass and barycentric momentum, finite motion through the close encounter, independent control effects, the 2- and 1,000-body boundaries, and invalid settings. Seven Chrome tests cover the existing observatory plus the complete encounter workflow: staged preset/control edits, generation, advancing time, star following, shared-center framing, exact reset, and switching back to the orbital preset. Reset-camera assertions capture reset and snapshot in the same browser action so cinematic motion cannot race the assertion. The encounter screenshot was visually reviewed for distinct amber/blue clusters and readable controls. No new sustained laptop performance benchmark or deployment is part of this update.


## First-person camera follow-up

The production build, 12 unit tests, and all 9 Chrome tests pass. Camera tests cover position and velocity alignment, changing direction, stationary-heading fallback, vertical flight, target retention, and cinematic exit. Browser checks exercise both presets while moving and paused, selecting a star, toggling back to orbit, default target selection, and exiting through Cinematic, Reset, and Generate. The viewed star's core and halo are hidden while riding it. The encounter first-person screenshot was visually reviewed for clear rendering and the active toolbar toggle. This update remains local-only.


## Five-scenario button verification

The production build, 17 unit tests, and all 10 Chrome tests pass. Added physics coverage checks seeded generation, mass and momentum, finite evolution, count boundaries, actual cloud contraction, binary-star velocities, and opposing disk angular momenta. Chrome verifies five accessible scenario buttons, exclusive active state, immediate switching, preservation of configured count, advancing time, exact reset, first-person for new scenarios, and button availability with collapsed settings at a 600px viewport. Binary, Counter-spin, and narrow-layout screenshots were visually reviewed. The earlier scenario dropdown has been removed. Work remains local.


## Ten-scenario verification

The production build, 26 unit tests, and 11 Chrome tests pass. New numerical evidence covers finite evolution and mass/momentum conservation for all five additions, count boundaries, an approaching visitor, actual cloud expansion, aligned initial orbital eccentricity, distinct ring planes, and the three-star population minimum. Chrome exercises immediate switching, advancing time, exact reset, and first-person across all eight added scenarios, plus ten-button visibility at 600px and 380px widths. At 380px the button gallery is verified above the settings panel without overlap. Tilted-ring, three-star, and narrow-layout screenshots were visually inspected. No deployment or new performance benchmark was performed.


## Natural-formation verification

The production build and 34 unit tests pass. All 12 Chrome tests passed for the fifteen-scenario gallery; after the final stream distribution/glow adjustment, the natural-formation browser test passed again. Added numerical checks cover all five new scenarios for seeded repeatability, mass/momentum, finite evolution, and population boundaries; they also distinguish cluster concentration, check initial cluster kinetic/potential ratios, confirm a mutual cluster orbit, and verify disk rotation and massive debris on both sides of the remnant. Browser coverage checks generation, advancing time, exact reset, exclusive button state, and first-person across all five additions. The full suite checks fifteen-button visibility and separation from settings at 380px. Spiral, globular, tidal-stream, and narrow-layout screenshots were visually reviewed. No new laptop performance guarantee or deployment is included.
