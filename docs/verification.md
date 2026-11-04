# First-version verification

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
