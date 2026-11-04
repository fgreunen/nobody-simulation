# Stellar simulation design

## Confirmed direction

- Browser-based scene setup and observation with limited interventions; there are no objectives, progression, or win/lose conditions.
- Newtonian gravity with numerical approximations and documented accuracy limits; scientific measurement reliability is outside the intended scope.
- Full three-dimensional motion with an orbiting, zooming camera that can follow objects.
- Laptops are the primary hardware target; high-end desktop hardware cannot be a prerequisite.
- Gravitating bodies and tracer particles are distinct populations and their counts must be reported separately.
- Large populations and beautiful spacescapes are goals; achievable population sizes and performance targets remain to be established.
- The first version has one configurable orbiting-system preset: one dominant, freely moving massive body with smaller bodies orbiting it. Stellar-cloud and colliding-galaxy presets are deferred. Individual object placement is deferred.
- Ordinary laptops with integrated graphics are the baseline. The default performance target is 30 FPS; larger populations can be experimental settings. The user's Intel Iris Xe laptop is the initial reference device; benchmark conditions and measured population budgets remain open.
- Close encounters use softened gravity and bodies pass through one another. Collision responses and other cosmic events, including clashes and black holes, are deferred.
- Interventions may explicitly depart from Newtonian physics, but all interventions are deferred from the first version, including the gravity well, repellors, and wormholes.
- Time controls include pause, speed adjustment, and reset to repeatable initial conditions. Rewind is deferred.
- Presentation should be as cinematic as possible: luminous stars, dust, depth, restrained trails, and minimal controls. Rendered sizes and colors prioritize presentation and readability over literal astronomical scale.
- All functionality runs in the browser, without accounts, multiplayer, or a server. Saving, snapshots, and scene-file export/import are deferred entirely.
- Space is unbounded: ejected bodies continue traveling without wrapping, bouncing, or automatic removal. A return-to-scene camera action restores orientation.
- Each preset uses a coherent relative physical scale. Initial controls express relative mass, compactness, and motion; calibrated astronomical units are deferred.
- Future gravity-well direction, outside the first version: one fixed, removable well with adjustable strength and depth, placed through a visible plane. It attracts objects without swallowing them. Its detailed placement workflow remains undecided.
- When requested speed exceeds stable calculation capacity, achieved simulation speed decreases and the interface reports that limitation.
- The default camera moves cinematically around or with the scene. Dragging or zooming immediately takes manual control; an explicit action resumes automatic viewing. Settings use a collapsible panel.
- Start with 100 gravitating bodies. Larger populations are subsequent measured scaling goals; 10,000 is not a first-version acceptance requirement and 100,000 remains aspirational.
- Visual quality stays consistent under load. Establish a suitable body count rather than automatically lowering resolution, glow, or other presentation settings. Population changes regenerate the scene rather than silently deleting bodies during evolution.
- Population, mass distribution, size, and initial-motion edits apply through an explicit Generate scene action. Camera controls and time controls apply immediately.
- WebGPU is required for the first version, with a clear compatibility message on unsupported devices and no WebGL fallback. The reference laptop's Chrome WebGPU hardware-adapter and compute probe passed; see browser capability notes.
- The revised first-build boundary is one orbiting-system preset, 100 initial gravitating bodies, no tracers or interventions, 3D softened Newtonian gravity, fixed cinematic quality targeting 30 FPS on the reference laptop, and the agreed camera/time/regeneration controls. Saving, other presets, and cosmic events are deferred.
- Population changes preserve total scene mass, distributing it among more or fewer bodies. A separate mass control changes total mass; mass distribution determines its division among bodies.
- Generate scene produces a fresh arrangement with the selected settings. Reset restores the exact initial arrangement of the current scene, restores the starting camera, removes any interventions in future versions, and leaves simulation paused.
- Automatic camera framing follows the main system rather than expanding to include every escaping body. Clicking an individual gravitating body enables following it; return-to-scene restores the main-system view.
- Delivery is a static website opened by URL. Simulation runs locally after loading. Installation and guaranteed offline availability are deferred.

## Camera controls

Confirmed: left-drag to orbit the current target, scroll or pinch to zoom, right-drag or Shift-drag to pan, and click a body to follow it. Explicit Return to scene and Cinematic camera actions restore main-system framing and automatic viewing respectively. Manual camera movement takes over from automatic viewing. Orbiting or zooming while following a body retains that target; panning releases following. Mouse and laptop trackpad are first-version input targets; touchscreen controls are deferred. A small collapsible hint explains the controls.

## Viewing pace

Default motion should be noticeable within a few seconds, with a representative orbit taking approximately 30–60 seconds. Different orbital distances retain their different periods. Speed controls span 0.25× to 4× and scale simulation time globally; pause is separate.

## Performance acceptance

Target 30 FPS on the reference laptop in Chrome with cinematic effects enabled and simulation running at normal speed. The confirmed fixed rendering resolution is 1280×720 (720p), scaled to fit the browser window; controls and text render at the window's native resolution. Visual quality and rendering resolution do not change automatically under load. Optimize first, then agree on a lower regenerated body count if necessary.

## Implementation work

- Select numerical methods and validate them within the accepted approximate-physics and stability boundaries.
- Implement and measure the orbiting-system preset, camera, scene controls, and cinematic rendering at 720p on the reference laptop.
- Establish the measured population budget without adding deferred features or automatically reducing visual quality.

## Status

The first version is implemented. The user confirmed the first-build boundary and subsequent scope reductions, camera controls, viewing pace, browser-only delivery, and 720p performance target. Seven numerical tests and six Chrome interaction/failure/lifecycle tests pass. A full laptop measurement observed approximately 59.95 FPS at normal simulation speed; the strict cinematic-mode benchmark was not fully satisfied because the camera entered manual mode. The user explicitly accepted the existing performance evidence and requested proceeding without further benchmark gating. See verification notes.
