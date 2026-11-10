import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { appearance } from './appearance';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { burstLifetime, characteristicTime, seededRandom, type SimulationState } from './physics';

const TRAIL_SAMPLES = 48;
export const RENDER_WIDTH = 1280;
export const RENDER_HEIGHT = 720;

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.06, 'rgba(255,255,255,.92)');
  gradient.addColorStop(0.17, 'rgba(255,255,255,.35)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,.075)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function nebulaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const random = seededRandom(7281);
  for (let i = 0; i < 35; i++) {
    const x = random() * 1024, y = random() * 512, radius = 90 + random() * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, i % 3 ? 'rgba(28,65,78,.065)' : 'rgba(88,64,54,.055)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class UniverseView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.01, 180);
  readonly renderer: THREE.WebGPURenderer;
  readonly device: GPUDevice;
  readonly canvas: HTMLCanvasElement;
  private pipeline: THREE.RenderPipeline;
  private marker = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthTest: false }));
  private cores: THREE.InstancedMesh | null = null;
  private halos: THREE.Sprite[] = [];
  private flashes = new Map<number, THREE.Sprite>();
  private trails: THREE.LineSegments | null = null;
  private history = new Float32Array();
  private trailPositions = new Float32Array();
  private trailColors = new Float32Array();
  private colors: THREE.Color[] = [];
  private historyHead = 0;
  private lastTrailTime = -Infinity;
  private haloTexture = glowTexture();
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private scale = new THREE.Vector3();

  private constructor(renderer: THREE.WebGPURenderer, device: GPUDevice) {
    this.renderer = renderer;
    this.device = device;
    this.canvas = renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Interactive three-dimensional stellar system');
    this.canvas.setAttribute('role', 'img');
    this.scene.background = new THREE.Color('#03060b');
    renderer.setPixelRatio(1);
    renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scenePass = pass(this.scene, this.camera);
    const color = scenePass.getTextureNode('output');
    this.pipeline = new THREE.RenderPipeline(renderer);
    this.pipeline.outputNode = color.add(bloom(color, 0.55, 0.5, 0.85));
    this.addBackground();
    const markerCanvas = document.createElement('canvas'); markerCanvas.width = markerCanvas.height = 64;
    const ctx = markerCanvas.getContext('2d')!;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.stroke();
    this.marker.material.map = new THREE.CanvasTexture(markerCanvas); this.marker.material.opacity = 0.85;
    this.marker.visible = false; this.scene.add(this.marker);
  }

  static async create(onLost: () => void): Promise<UniverseView> {
    if (!navigator.gpu) throw new Error('WebGPU is unavailable. Open this observatory in an up-to-date Chrome or Edge browser with graphics acceleration enabled.');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU graphics adapter is available. Check your browser’s graphics acceleration settings and graphics driver.');
    const device = await adapter.requestDevice();
    const renderer = new THREE.WebGPURenderer({ device, antialias: true, alpha: false });
    renderer.onDeviceLost = onLost;
    try {
      await renderer.init();
      if (!(renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend) {
        throw new Error('A WebGPU renderer is required for this observatory.');
      }
      device.lost.then(onLost);
      return new UniverseView(renderer, device);
    } catch (error) {
      renderer.dispose(); device.destroy(); throw error;
    }
  }

  private addBackground(): void {
    const random = seededRandom(1119);
    const positions = new Float32Array(2200 * 3), colors = new Float32Array(2200 * 3);
    for (let i = 0; i < 2200; i++) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2, radius = 36 + random() * 40;
      const r = Math.sqrt(1 - y * y);
      positions.set([r * Math.cos(angle) * radius, y * radius, r * Math.sin(angle) * radius], i * 3);
      const value = 0.1 + random() ** 5 * 0.65;
      colors.set([value * 0.82, value * 0.9, value], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ vertexColors: true, size: 0.055, sizeAttenuation: true, depthWrite: false }));
    this.scene.add(stars);
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTexture(), transparent: true, opacity: 0.45, depthWrite: false }));
    haze.position.set(0, 1, -38); haze.scale.set(100, 60, 1);
    this.scene.add(haze);
  }

  setScene(state: SimulationState): void {
    for (const flash of this.flashes.values()) { this.scene.remove(flash); flash.material.dispose(); }
    this.flashes.clear();
    if (this.cores) { this.scene.remove(this.cores); this.cores.geometry.dispose(); (this.cores.material as THREE.Material).dispose(); this.cores.dispose(); }
    if (this.trails) { this.scene.remove(this.trails); this.trails.geometry.dispose(); (this.trails.material as THREE.Material).dispose(); }
    for (const halo of this.halos) { this.scene.remove(halo); (halo.material as THREE.Material).dispose(); }
    this.halos = []; this.colors = [];
    const material = new THREE.MeshBasicMaterial();
    this.cores = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), material, state.count);
    this.cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cores.frustumCulled = false;
    for (let i = 0; i < state.count; i++) {
      const look = appearance(state.stars[i]);
      const color = new THREE.Color().setRGB(...look.color as [number, number, number], THREE.SRGBColorSpace);
      this.colors.push(color);
      this.cores.setColorAt(i, color.clone().multiplyScalar(look.brightness));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.haloTexture, color, opacity: 0.65, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.scene.add(halo); this.halos.push(halo);
    }
    this.cores.instanceColor!.needsUpdate = true;
    this.scene.add(this.cores);
    this.history = new Float32Array(state.count * TRAIL_SAMPLES * 3);
    for (let i = 0; i < state.count; i++) {
      for (let sample = 0; sample < TRAIL_SAMPLES; sample++) {
        this.history.set(state.positions.subarray(i * 3, i * 3 + 3), (i * TRAIL_SAMPLES + sample) * 3);
      }
    }
    this.historyHead = 0; this.lastTrailTime = state.time;
    const length = state.count * (TRAIL_SAMPLES - 1) * 6;
    this.trailPositions = new Float32Array(length);
    this.trailColors = new Float32Array(length);
    for (let i = 0; i < state.count; i++) {
      for (let j = 0; j < TRAIL_SAMPLES - 1; j++) {
        const fade = (1 - j / (TRAIL_SAMPLES - 1)) ** 1.7 * 0.3;
        const c = this.colors[i];
        this.trailColors.set([c.r * fade, c.g * fade, c.b * fade, c.r * fade, c.g * fade, c.b * fade], (i * (TRAIL_SAMPLES - 1) + j) * 6);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trails = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trails.frustumCulled = false;
    this.scene.add(this.trails);
    this.update(state);
  }

  update(state: SimulationState): void {
    if (!this.cores) return;
    const liveBursts = new Set(state.bursts.map(burst => burst.id));
    for (const [id, flash] of this.flashes) {
      if (!liveBursts.has(id)) { this.scene.remove(flash); flash.material.dispose(); this.flashes.delete(id); }
    }
    for (const burst of state.bursts) {
      let flash = this.flashes.get(burst.id);
      if (!flash) {
        flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.haloTexture, color: new THREE.Color(9, 7, 4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        flash.position.fromArray(burst.position);
        this.flashes.set(burst.id, flash); this.scene.add(flash);
      }
      const age = Math.min(1, (state.time - burst.time) / burstLifetime(state));
      const strength = Math.cbrt(burst.radiatedMass / (state.initialMass * 0.0002));
      flash.scale.setScalar(state.settings.radius * strength * (0.12 + 1.3 * age));
      flash.material.opacity = (1 - age) ** 2;
    }
    for (let i = 0; i < state.count; i++) {
      this.position.fromArray(state.positions, i * 3);
      const radius = appearance(state.stars[i]).radius;
      const look = appearance(state.stars[i]);
      const color = new THREE.Color().setRGB(...look.color as [number, number, number], THREE.SRGBColorSpace);
      this.cores.setColorAt(i, color.clone().multiplyScalar(look.brightness));
      this.halos[i].material.color.copy(color);
      this.scale.setScalar(radius);
      if (state.masses[i] === 0) this.scale.setScalar(0);
      this.halos[i].visible = state.masses[i] > 0;
      this.halos[i].scale.setScalar(radius * 9);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.cores.setMatrixAt(i, this.matrix);
      this.halos[i].position.copy(this.position);
    }
    this.cores.instanceColor!.needsUpdate = true;
    this.cores.instanceMatrix.needsUpdate = true;
    if (state.time - this.lastTrailTime >= 0.004 * characteristicTime(state)) {
      this.historyHead = (this.historyHead + 1) % TRAIL_SAMPLES;
      for (let i = 0; i < state.count; i++) this.history.set(state.positions.subarray(i * 3, i * 3 + 3), (i * TRAIL_SAMPLES + this.historyHead) * 3);
      this.lastTrailTime = state.time;
    }
    for (let i = 0; i < state.count; i++) {
      for (let j = 0; j < TRAIL_SAMPLES - 1; j++) {
        const a = (this.historyHead - j + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const b = (a - 1 + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const index = (i * (TRAIL_SAMPLES - 1) + j) * 6;
        if (state.masses[i] === 0) { this.trailPositions.fill(0, index, index + 6); continue; }
        const start = (i * TRAIL_SAMPLES + a) * 3, end = (i * TRAIL_SAMPLES + b) * 3;
        this.trailPositions.set(this.history.subarray(start, start + 3), index);
        this.trailPositions.set(this.history.subarray(end, end + 3), index + 3);
      }
    }
    this.trails!.geometry.attributes.position.needsUpdate = true;
  }

  select(state: SimulationState, index: number | null): void {
    this.marker.visible = index !== null;
    if (index !== null) { this.marker.position.fromArray(state.positions, index * 3); this.marker.scale.setScalar(appearance(state.stars[index]).radius * 6); }
  }

  render(): void { this.pipeline.render(); }

  pick(clientX: number, clientY: number, state: SimulationState): number | null {
    const rect = this.canvas.getBoundingClientRect();
    let selected: number | null = null, nearest = 14;
    for (let i = 0; i < state.count; i++) {
      if (state.masses[i] === 0) continue;
      this.position.fromArray(state.positions, i * 3).project(this.camera);
      if (this.position.z < -1 || this.position.z > 1) continue;
      const x = rect.left + (this.position.x + 1) * rect.width / 2;
      const y = rect.top + (1 - this.position.y) * rect.height / 2;
      const distance = Math.hypot(clientX - x, clientY - y);
      if (distance < nearest) { nearest = distance; selected = i; }
    }
    return selected;
  }

  dispose(): void {
    this.pipeline.dispose(); this.renderer.dispose(); this.device.destroy();
  }
}
