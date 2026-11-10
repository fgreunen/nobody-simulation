import './style.css';
import { CameraRig } from './camera';
import { DEFAULT_SETTINGS, DEFAULT_SEED, inspectBody, unitsToYears, calculateAccelerations, SimulationClock, createScene } from './physics';
import { UniverseView } from './universe';
import { SCENARIOS, createScenario, type ScenarioId } from './scenarios';

const icons: Record<string, string> = {
  orbit: '<ellipse cx="12" cy="12" rx="11" ry="4.5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="2"/>',
  pause: '<path d="M9 5v14M15 5v14"/>', play: '<path d="m9 5 11 7-11 7Z"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  target: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="observatory">
  <div id="viewport" class="viewport"><div class="vignette"></div></div>
  <header class="topbar"><a class="brand" href="./" aria-label="Nobody stellar observatory">${icon('orbit')}<span>NOBODY<span class="brand-sub">STELLAR<br>OBSERVATORY</span></span></a>
    <div class="header-metrics">
      <div class="physical-clock" title="kyr = 1,000 years"><div id="rate"><span>Requested: <span id="requested-rate"></span></span><span>Achieved: <span id="achieved-rate"></span></span></div></div>
      <span class="metrics-divider" aria-hidden="true"></span>
      <span class="status-stats"><span><b id="body-count">100</b> BODIES</span><span><b id="merger-count">0</b> MERGERS</span><span><b id="fps">—</b> FPS</span></span>
    </div>
  <section class="scene-panel" aria-label="Scene settings">
    <div id="settings-content">
      <form id="scene-form"><fieldset id="settings-fields" disabled>
        <label class="parameter scenario-picker"><span>Scenario:</span><select id="scenario" aria-label="Scenario">${SCENARIOS.map(scenario => `<option value="${scenario.id}">${scenario.name}</option>`).join('')}</select></label>
        <label class="parameter"><span>Bodies <output id="count-value" for="count">100</output></span><input id="count" name="count" type="range" min="32" max="1000" step="1" value="100"><small>Every star contributes to gravity</small></label>
        <label class="parameter"><span>Half-mass radius <output id="radius-value" for="radius">1.00 pc</output></span><input id="radius" name="radius" type="range" min="0.5" max="2" step="0.05" value="1"><small>3D radius enclosing half the initial mass</small></label>
        <button type="submit" class="generate">Generate scene ${icon('arrow')}</button>
      </fieldset></form>
    </div>
  </section>
  </header>
  <aside id="inspector" class="inspector" aria-label="Selected star" hidden><div id="inspector-content"></div></aside>
  <footer class="statusbar"><span aria-hidden="true"></span>
    <nav class="toolbar" aria-label="Camera controls">
      <button id="pause" class="play-control" disabled aria-label="Pause simulation">${icon('pause')}</button>
      <label class="speed-control" title="Requested playback speed"><span>TIME</span><input id="speed" type="range" min="1" max="100" step="1" value="1" disabled aria-label="Simulation speed" aria-valuetext="1×"><output id="speed-value" for="speed">1×</output></label>
      <span class="toolbar-divider"></span><button id="home" class="tool-button" disabled>${icon('target')}<span>Recenter</span></button>
      <details class="controls-hint"><summary role="button" aria-label="How to explore"><span aria-hidden="true">?</span></summary><div><p><b>Drag</b><span>Orbit around the scene</span></p><p><b>Scroll / pinch</b><span>Move closer or farther</span></p><p><b>Shift + drag</b><span>Pan · right-drag also works</span></p><p><b>Click a star</b><span>Inspect and follow its motion</span></p><p class="hint-note">Move the camera to take control.<br>Recenter restores the automatic cluster view.</p></div></details>
    </nav>
  </footer>
  <div id="loading" class="loading"><span class="loader-orbit">${icon('orbit')}</span><span>Finding our place in the universe…</span></div>
  <section id="failure" class="failure" role="alert" hidden><span class="eyebrow">OBSERVATORY UNAVAILABLE</span><h2>A window we can’t open yet.</h2><p id="failure-message"></p><button id="reload" class="generate">Try again ${icon('arrow')}</button></section>
</main>`;
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const clock = new SimulationClock();
let state = createScene(DEFAULT_SETTINGS, DEFAULT_SEED);
let activeScenario: ScenarioId = 'open-cluster';
let view: UniverseView | null = null, rig: CameraRig | null = null, failed = false;
let lastFrame = 0, frames = 0, realSeconds = 0, simulatedUnits = 0;
let statsSeconds = 0, statsFrames = 0, statsUnits = 0, fps = 0, achievedSpeed = 0;

let inspectorKey = '';
function syncInspector(): void {
  const body = inspectBody(state, rig?.following ?? null);
  element('inspector').hidden = !body;
  view?.select(state, body?.index ?? null);
  const key = body ? `${state.seed}:${body.index}:${state.mergerCount}` : 'none';
  if (key === inspectorKey) return;
  inspectorKey = key;
  element('inspector-content').innerHTML = body ? `<h2>Star ${body.index + 1}</h2><p>${body.kind} · ${body.subtype}</p><dl><dt>Mass</dt><dd>${body.mass.toFixed(3)} M☉</dd><dt>Physical radius</dt><dd>${body.radius.toFixed(3)} R☉</dd><dt>Capture radius</dt><dd>${body.encounterRadius.toFixed(3)} pc</dd><dt>Surface temperature</dt><dd>${Math.round(body.temperature).toLocaleString()} K</dd><dt>Luminosity</dt><dd>${body.luminosity.toPrecision(3)} L☉</dd></dl>${body.kind === 'merger remnant' ? '<p>Remnant properties use a homology approximation.</p>' : ''}` : 'Click a star to inspect and follow it.';
}
function syncPhysicalClock(): void {
  const normal = unitsToYears(clock.requestedRate(state)) / clock.speed;
  const requested = Math.round(normal * clock.speed / 1000);
  const achieved = Math.round(clock.paused ? 0 : normal * achievedSpeed / 1000);
  element('requested-rate').textContent = `${requested.toLocaleString()} kyr/s`;
  element('achieved-rate').textContent = `${achieved.toLocaleString()} kyr/s`;
  element('achieved-rate').classList.toggle('below-requested', achieved < requested);
}
function syncCameraUI(): void {
  if (!rig) return;
  syncInspector();
}
function syncPlayback(): void {
  element('pause').innerHTML = icon(clock.paused ? 'play' : 'pause');
  element('pause').setAttribute('aria-label', clock.paused ? 'Play simulation' : 'Pause simulation');
  syncPhysicalClock();
}
function syncSceneUI(): void {
  element('body-count').textContent = String(state.activeCount);
  element('merger-count').textContent = String(state.mergerCount);
}
function resetStats(): void { statsSeconds = statsFrames = statsUnits = achievedSpeed = 0; clock.clear(); lastFrame = 0; }
function fatal(message: string): void {
  if (failed) return;
  failed = true; clock.paused = true;
  element('loading').hidden = true; element('failure').hidden = false;
  element('failure-message').textContent = message;
  element<HTMLFieldSetElement>('settings-fields').disabled = true;
  for (const id of ['pause', 'speed', 'home']) (element(id) as HTMLButtonElement).disabled = true;
}
element('reload').addEventListener('click', () => location.reload());
for (const [id, format] of [['count', (n: number) => String(n)], ['radius', (n: number) => `${n.toFixed(2)} pc`]] as const) {
  const input = element<HTMLInputElement>(id);
  const update = () => { element(`${id}-value`).textContent = format(Number(input.value)); input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`); };
  input.addEventListener('input', update); update();
}

element('scene-form').addEventListener('submit', event => {
  event.preventDefault(); if (!view || !rig || failed) return;
  activeScenario = element<HTMLSelectElement>('scenario').value as ScenarioId;
  state = createScenario({ count: Number(element<HTMLInputElement>('count').value), radius: Number(element<HTMLInputElement>('radius').value) }, crypto.getRandomValues(new Uint32Array(1))[0], activeScenario);
  view.setScene(state); rig.reset(); clock.paused = false;
  resetStats(); syncSceneUI(); syncPlayback(); syncInspector();
});
element('pause').addEventListener('click', () => { clock.paused = !clock.paused; resetStats(); syncPlayback(); });
element('speed').addEventListener('input', () => {
  const input = element<HTMLInputElement>('speed');
  clock.speed = Number(input.value);
  const label = `${clock.speed}×`;
  element('speed-value').textContent = label; input.setAttribute('aria-valuetext', label);
  resetStats(); syncPhysicalClock();
});
element('home').addEventListener('click', () => rig?.returnToScene());
for (const event of ['visibilitychange', 'freeze', 'resume']) document.addEventListener(event, resetStats);
function animate(timestamp: number): void {
  if (failed || !view || !rig) return;
  requestAnimationFrame(animate);
  if (document.hidden) { lastFrame = 0; return; }
  const delta = lastFrame ? Math.max(0, (timestamp - lastFrame) / 1000) : 0; lastFrame = timestamp;
  const advanced = clock.advance(state, delta); rig.update(Math.min(delta, 0.1));
  element('body-count').textContent = String(state.activeCount);
  element('merger-count').textContent = String(state.mergerCount);
  view.update(state); syncInspector(); syncPhysicalClock();
  try { view.render(); } catch (error) { fatal(`The graphics renderer stopped. Reload to reopen the observatory. ${error instanceof Error ? error.message : ''}`); return; }
  frames++; realSeconds += delta; simulatedUnits += advanced; statsFrames++; statsSeconds += delta; statsUnits += advanced;
  if (statsSeconds >= 0.5) {
    fps = statsFrames / statsSeconds; achievedSpeed = statsUnits / (clock.requestedRate(state) / clock.speed * statsSeconds);
    element('fps').textContent = String(Math.round(fps));
    element('fps').classList.toggle('below-target', fps < 30);
    statsFrames = statsSeconds = statsUnits = 0;
  }
}
Object.defineProperty(window, '__observatoryMetrics', { get: () => ({ frames, realSeconds, simulatedUnits, normalUnitsPerSecond: clock.requestedRate(state) / clock.speed, requestedSpeed: clock.speed, paused: clock.paused, bodyCount: state.activeCount, cinematic: rig?.cinematic ?? false, ready: !!view && !failed, renderWidth: view?.canvas.width ?? 0, renderHeight: view?.canvas.height ?? 0 }) });
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  Object.defineProperty(window, '__observatory', { value: {
    snapshot: () => ({ scenario: activeScenario, count: state.count, activeCount: state.activeCount, radiatedMass: state.radiatedMass, mergerCount: state.mergerCount, bursts: state.bursts, seed: state.seed, time: state.time, settings: { ...state.settings }, initialMass: state.initialMass, stars: state.stars.map(star => ({ ...star })), positions: Array.from(state.positions), velocities: Array.from(state.velocities), masses: Array.from(state.masses), paused: clock.paused, speed: clock.speed, cinematic: rig?.cinematic, following: rig?.following, target: rig?.controls.target.toArray(), camera: view?.camera.position.toArray(), frames, realSeconds, simulatedUnits, fps, achievedSpeed, ready: !!view && !failed }),
    projectBody: (index: number) => { if (!view) return null; const v = view.camera.position.clone().fromArray(state.positions, index * 3).project(view.camera), rect = view.canvas.getBoundingClientRect(); return { x: rect.left + (v.x + 1) * rect.width / 2, y: rect.top + (1 - v.y) * rect.height / 2 }; },
    loseDevice: () => view?.device.destroy(),
    setBody: (index: number, position: [number, number, number], velocity: [number, number, number]) => { state.positions.set(position, index * 3); state.velocities.set(velocity, index * 3); calculateAccelerations(state); },
  } });
}
async function start(): Promise<void> {
  try {
    view = await UniverseView.create(() => fatal('The connection to your graphics device was lost. Reload to start a fresh scene.'));
    element('viewport').prepend(view.canvas); view.setScene(state); rig = new CameraRig(view, () => state, syncCameraUI); syncCameraUI(); view.render();
    element('loading').hidden = true; element<HTMLFieldSetElement>('settings-fields').disabled = false;
    for (const id of ['pause', 'speed', 'home']) (element(id) as HTMLButtonElement).disabled = false;
    syncSceneUI(); syncPlayback(); document.documentElement.dataset.ready = 'true'; requestAnimationFrame(animate);
  } catch (error) { fatal(error instanceof Error ? error.message : 'WebGPU could not initialize on this device.'); }
}
void start();
