import './style.css';
import { CameraRig } from './camera';
import { DEFAULT_SETTINGS, SIMULATION_UNITS_PER_SECOND, SimulationClock, cloneState, createScene, type SceneSettings } from './physics';
import { UniverseView } from './universe';

const icons: Record<string, string> = {
  orbit: '<ellipse cx="12" cy="12" rx="11" ry="4.5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="21" cy="6" r="1.4" fill="currentColor"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  target: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="#0c131c"/><circle cx="15" cy="17" r="2" fill="#0c131c"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  chevron: '<path d="m8 5 7 7-7 7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
};
const icon = (name: string, extra = '') => `<svg ${extra} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="observatory">
    <div id="viewport" class="viewport"><div class="vignette"></div></div>
    <header class="topbar">
      <a class="brand" href="./" aria-label="Nobody stellar observatory">${icon('orbit')}<span>NOBODY<span class="brand-sub">STELLAR OBSERVATORY</span></span></a>
      <span class="header-note">A SMALL WINDOW INTO THE INFINITE</span>
      <div class="live"><span class="live-dot"></span><span id="live-label">INITIALIZING</span><span class="version">VOL. 001</span></div>
    </header>

    <section class="scene-panel" aria-label="Scene settings">
      <div class="panel-heading"><span class="eyebrow">THE INITIAL CONDITIONS</span><button id="settings-toggle" class="icon-button" aria-label="Collapse scene settings" aria-expanded="true" aria-controls="settings-content">${icon('sliders')}</button></div>
      <div id="settings-content">
        <h1>Order.<br>Then possibility.</h1>
        <p class="intro"><span id="intro-count">A hundred bodies.</span> One shared gravity.<br>Set a universe in motion.</p>
        <div class="preset"><span class="preset-icon">${icon('orbit')}</span><span><strong>Orbital system</strong><small>ONE DOMINANT STAR · THREE DIMENSIONS</small></span><span class="preset-index">01</span></div>
        <form id="scene-form">
          <fieldset id="settings-fields" disabled>
            <label class="parameter"><span>Bodies <output id="count-value" for="count">100</output></span><input id="count" name="count" type="range" min="2" max="100" step="1" value="100" /><small>All bodies contribute to gravity</small></label>
            <label class="parameter"><span>Total mass <output id="mass-value" for="mass">1.00×</output></span><input id="mass" name="mass" type="range" min="0.25" max="4" step="0.05" value="1" /></label>
            <label class="parameter"><span>System radius <output id="radius-value" for="radius">1.00×</output></span><input id="radius" name="radius" type="range" min="0.5" max="2" step="0.05" value="1" /></label>
            <label class="parameter"><span>Central mass <output id="share-value" for="share">95%</output></span><input id="share" name="share" type="range" min="80" max="99" step="1" value="95" /></label>
            <label class="parameter"><span>Orbital motion <output id="motion-value" for="motion">1.00×</output></span><input id="motion" name="motion" type="range" min="0.5" max="1.5" step="0.05" value="1" /></label>
            <button type="submit" class="generate">Generate scene ${icon('arrow')}</button>
          </fieldset>
          <p class="form-note" id="form-note">A new arrangement. The same laws.</p>
        </form>
      </div>
    </section>

    <div class="scene-coordinate" aria-hidden="true"><span>ORBITAL STUDY</span><span>01 / ∞</span></div>
    <div class="scene-caption"><span class="caption-line"></span><div><span class="eyebrow" id="view-mode">CINEMATIC VIEW</span><span id="focus-label">Observing the main system</span></div></div>

    <nav class="toolbar" aria-label="Simulation controls">
      <button id="pause" class="play-control" disabled aria-label="Pause simulation">${icon('pause')}</button>
      <span class="toolbar-divider"></span>
      <label class="speed-control" title="Simulation speed"><span>TIME</span><select id="speed" disabled aria-label="Simulation speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
      <span class="toolbar-divider"></span>
      <button id="reset" class="tool-button" disabled title="Restore this scene’s starting arrangement">${icon('reset')}<span>Reset</span></button>
      <button id="home" class="tool-button" disabled>${icon('target')}<span>Recenter</span></button>
      <span class="toolbar-divider"></span>
      <button id="cinematic" class="tool-button active" disabled aria-pressed="true">${icon('orbit')}<span>Cinematic</span></button>
    </nav>

    <details class="controls-hint"><summary>How to explore <span>?</span></summary><div><p><b>Drag</b><span>Orbit around the scene</span></p><p><b>Scroll / pinch</b><span>Move closer or farther</span></p><p><b>Shift + drag</b><span>Pan · right-drag also works</span></p><p><b>Click a star</b><span>Follow its motion</span></p><p class="hint-note">Move the camera to take control.<br>Choose Cinematic to drift again.</p></div></details>
    <footer class="statusbar"><span><i></i> <span id="status">PREPARING YOUR OBSERVATORY</span></span><span class="status-stats"><span><b id="body-count">100</b> BODIES</span><span><b id="fps">—</b> FPS</span><span>720P <span class="status-separator">/</span> WEBGPU</span></span></footer>
    <div id="loading" class="loading"><span class="loader-orbit">${icon('orbit')}</span><span>Finding our place in the universe…</span></div>
    <section id="failure" class="failure" role="alert" hidden><span class="eyebrow">OBSERVATORY UNAVAILABLE</span><h2>A window we can’t open yet.</h2><p id="failure-message"></p><button id="reload" class="generate">Try again ${icon('arrow')}</button></section>
  </main>`;

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const clock = new SimulationClock();
let state = createScene(DEFAULT_SETTINGS, crypto.getRandomValues(new Uint32Array(1))[0]);
let initial = cloneState(state);
let view: UniverseView | null = null;
let rig: CameraRig | null = null;
let failed = false;
let lastFrame = 0;
let frames = 0, realSeconds = 0, simulatedUnits = 0;
let statsSeconds = 0, statsFrames = 0, statsUnits = 0;
let fps = 0, achievedSpeed = 1;

function syncCameraUI(): void {
  if (!rig) return;
  element('cinematic').classList.toggle('active', rig.cinematic);
  element('cinematic').setAttribute('aria-pressed', String(rig.cinematic));
  element('view-mode').textContent = rig.cinematic ? 'CINEMATIC VIEW' : rig.following === null ? 'FREE EXPLORATION' : 'FOLLOWING A BODY';
  element('focus-label').textContent = rig.following === null ? (rig.cinematic ? 'Observing the main system' : 'Your own perspective') : rig.following === 0 ? 'The dominant star' : `Companion ${String(rig.following).padStart(2, '0')}`;
}

function syncPlayback(): void {
  const button = element<HTMLButtonElement>('pause');
  button.innerHTML = icon(clock.paused ? 'play' : 'pause');
  button.setAttribute('aria-label', clock.paused ? 'Play simulation' : 'Pause simulation');
  element('live-label').textContent = clock.paused ? 'TIME PAUSED' : 'LIVE SIMULATION';
  document.body.classList.toggle('paused', clock.paused);
  element('status').textContent = clock.paused ? 'TIME IS STILL · SPACE IS YOURS TO EXPLORE' : 'ALL BODIES IN MUTUAL GRAVITY';
}

function fatal(message: string): void {
  if (failed) return;
  failed = true; clock.paused = true;
  element('loading').hidden = true;
  element('failure').hidden = false;
  element('failure-message').textContent = message;
  element('live-label').textContent = 'UNAVAILABLE';
  element('status').textContent = 'OBSERVATORY OFFLINE';
  element<HTMLFieldSetElement>('settings-fields').disabled = true;
  for (const id of ['pause', 'speed', 'reset', 'home', 'cinematic']) (element(id) as HTMLButtonElement).disabled = true;
}

element('reload').addEventListener('click', () => location.reload());
element('settings-toggle').addEventListener('click', () => {
  const content = element('settings-content');
  content.hidden = !content.hidden;
  element('settings-toggle').setAttribute('aria-expanded', String(!content.hidden));
  element('settings-toggle').setAttribute('aria-label', content.hidden ? 'Expand scene settings' : 'Collapse scene settings');
});

const fields = [
  ['count', 'count-value', (n: number) => String(n)],
  ['mass', 'mass-value', (n: number) => `${n.toFixed(2)}×`],
  ['radius', 'radius-value', (n: number) => `${n.toFixed(2)}×`],
  ['share', 'share-value', (n: number) => `${n}%`],
  ['motion', 'motion-value', (n: number) => `${n.toFixed(2)}×`],
] as const;
for (const [id, output, format] of fields) {
  const input = element<HTMLInputElement>(id);
  const update = () => {
    element(output).textContent = format(Number(input.value));
    input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  };
  input.addEventListener('input', () => {
    update(); element('form-note').textContent = 'New settings apply when you generate.';
    element('form-note').classList.add('pending');
  });
  update();
}

function resetStats(): void {
  statsSeconds = 0; statsFrames = 0; statsUnits = 0;
  achievedSpeed = clock.speed; clock.clear(); lastFrame = 0;
}

element('scene-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!view || !rig || failed) return;
  const settings: SceneSettings = {
    count: Number(element<HTMLInputElement>('count').value),
    totalMass: Number(element<HTMLInputElement>('mass').value),
    radius: Number(element<HTMLInputElement>('radius').value),
    centralShare: Number(element<HTMLInputElement>('share').value) / 100,
    orbitalSpeed: Number(element<HTMLInputElement>('motion').value),
  };
  state = createScene(settings, crypto.getRandomValues(new Uint32Array(1))[0]);
  initial = cloneState(state);
  view.setScene(state); rig.reset(); clock.paused = false;
  resetStats(); syncPlayback();
  element('body-count').textContent = String(state.count);
  element('intro-count').textContent = `${state.count} bodies.`;
  element('form-note').textContent = 'A new arrangement. The same laws.';
  element('form-note').classList.remove('pending');
});
element('pause').addEventListener('click', () => { clock.paused = !clock.paused; resetStats(); syncPlayback(); });
element('speed').addEventListener('change', () => { clock.speed = Number(element<HTMLSelectElement>('speed').value); resetStats(); });
element('reset').addEventListener('click', () => {
  if (!view || !rig) return;
  state = cloneState(initial); clock.paused = true;
  view.setScene(state); rig.reset(); resetStats(); syncPlayback();
});
element('home').addEventListener('click', () => rig?.returnToScene());
element('cinematic').addEventListener('click', () => rig?.resumeCinematic());
const resetFrameTiming = () => { clock.clear(); lastFrame = 0; statsSeconds = 0; statsFrames = 0; statsUnits = 0; };
document.addEventListener('visibilitychange', resetFrameTiming);
document.addEventListener('freeze', resetFrameTiming);
document.addEventListener('resume', resetFrameTiming);

function animate(timestamp: number): void {
  if (failed || !view || !rig) return;
  requestAnimationFrame(animate);
  if (document.hidden) { lastFrame = 0; return; }
  const delta = lastFrame ? Math.max(0, (timestamp - lastFrame) / 1000) : 0;
  lastFrame = timestamp;
  const advanced = clock.advance(state, delta);
  view.update(state); rig.update(Math.min(delta, 0.1));
  try { view.render(); } catch (error) { fatal(`The graphics renderer stopped. Reload to reopen the observatory. ${error instanceof Error ? error.message : ''}`); return; }
  frames++; realSeconds += delta; simulatedUnits += advanced;
  statsFrames++; statsSeconds += delta; statsUnits += advanced;
  if (statsSeconds >= 0.5) {
    fps = statsFrames / statsSeconds;
    achievedSpeed = statsUnits / (SIMULATION_UNITS_PER_SECOND * statsSeconds);
    element('fps').textContent = String(Math.round(fps));
    element('status').textContent = clock.paused ? 'TIME IS STILL · SPACE IS YOURS TO EXPLORE' : achievedSpeed < clock.speed * 0.95 ? `ACHIEVING ${achievedSpeed.toFixed(2)}× OF REQUESTED ${clock.speed}× · STABILITY PRESERVED` : 'ALL BODIES IN MUTUAL GRAVITY';
    statsFrames = 0; statsSeconds = 0; statsUnits = 0;
  }
}

// Read-only counters let the shipped build be benchmarked without changing its behavior.
Object.defineProperty(window, '__observatoryMetrics', { get: () => ({
  frames, realSeconds, simulatedUnits, requestedSpeed: clock.speed, paused: clock.paused,
  bodyCount: state.count, cinematic: rig?.cinematic ?? false, ready: !!view && !failed,
  renderWidth: view?.canvas.width ?? 0, renderHeight: view?.canvas.height ?? 0,
}) });

// Development-only inspection for numerical/browser acceptance tests; no production controls.
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__observatory', { value: {
    snapshot: () => ({ count: state.count, seed: state.seed, time: state.time, settings: { ...state.settings }, positions: Array.from(state.positions), velocities: Array.from(state.velocities), masses: Array.from(state.masses), paused: clock.paused, speed: clock.speed, cinematic: rig?.cinematic, following: rig?.following, target: rig?.controls.target.toArray(), camera: view?.camera.position.toArray(), frames, realSeconds, simulatedUnits, fps, achievedSpeed, ready: !!view && !failed }),
    projectBody: (index: number) => {
      if (!view) return null;
      const v = view.camera.position.clone().fromArray(state.positions, index * 3).project(view.camera);
      const rect = view.canvas.getBoundingClientRect();
      return { x: rect.left + (v.x + 1) * rect.width / 2, y: rect.top + (1 - v.y) * rect.height / 2 };
    },
    loseDevice: () => view?.device.destroy(),
  } });
}

async function start(): Promise<void> {
  try {
    view = await UniverseView.create(() => fatal('The connection to your graphics device was lost. Your browser may have suspended the GPU. Reload to start a fresh scene.'));
    element('viewport').prepend(view.canvas);
    view.setScene(state);
    rig = new CameraRig(view, () => state, syncCameraUI);
    syncCameraUI();
    // Warm shader pipelines before dismissing the loading overlay.
    view.render();
    element('loading').hidden = true;
    element<HTMLFieldSetElement>('settings-fields').disabled = false;
    for (const id of ['pause', 'speed', 'reset', 'home', 'cinematic']) (element(id) as HTMLButtonElement).disabled = false;
    syncPlayback();
    document.documentElement.dataset.ready = 'true';
    requestAnimationFrame(animate);
  } catch (error) { fatal(error instanceof Error ? error.message : 'WebGPU could not initialize on this device.'); }
}
void start();
