import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { seededRandom, type SimulationState } from './physics';

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
  private cores: THREE.InstancedMesh | null = null;
  private halos: THREE.Sprite[] = [];
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
    if (this.cores) { this.scene.remove(this.cores); this.cores.geometry.dispose(); (this.cores.material as THREE.Material).dispose(); this.cores.dispose(); }
    if (this.trails) { this.scene.remove(this.trails); this.trails.geometry.dispose(); (this.trails.material as THREE.Material).dispose(); }
    for (const halo of this.halos) { this.scene.remove(halo); (halo.material as THREE.Material).dispose(); }
    this.halos = []; this.colors = [];
    const material = new THREE.MeshBasicMaterial();
    this.cores = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), material, state.count);
    this.cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cores.frustumCulled = false;
    const random = seededRandom(state.seed + 91);
    const palette = ['#ffd6a0', '#dbe8ff', '#a4d5ff', '#ffe8c1', '#a4e1da'];
    for (let i = 0; i < state.count; i++) {
      const color = new THREE.Color(i === 0 ? '#ffe2af' : palette[Math.floor(random() * palette.length)]);
      this.colors.push(color);
      this.cores.setColorAt(i, color.clone().multiplyScalar(i === 0 ? 4 : 2));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.haloTexture, color: color.clone().multiplyScalar(i === 0 ? 2.8 : 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar((i === 0 ? 0.65 : 0.095) * state.settings.radius);
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
        const fade = (1 - j / (TRAIL_SAMPLES - 1)) ** 1.7 * (i === 0 ? 0.04 : 0.5);
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
    for (let i = 0; i < state.count; i++) {
      this.position.fromArray(state.positions, i * 3);
      this.scale.setScalar(state.settings.radius * (i === 0 ? 0.028 : 0.0065));
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.cores.setMatrixAt(i, this.matrix);
      this.halos[i].position.copy(this.position);
    }
    this.cores.instanceMatrix.needsUpdate = true;
    if (state.time - this.lastTrailTime >= 0.004 * Math.sqrt(state.settings.radius ** 3 / state.settings.totalMass)) {
      this.historyHead = (this.historyHead + 1) % TRAIL_SAMPLES;
      for (let i = 0; i < state.count; i++) this.history.set(state.positions.subarray(i * 3, i * 3 + 3), (i * TRAIL_SAMPLES + this.historyHead) * 3);
      this.lastTrailTime = state.time;
    }
    for (let i = 0; i < state.count; i++) {
      for (let j = 0; j < TRAIL_SAMPLES - 1; j++) {
        const a = (this.historyHead - j + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const b = (a - 1 + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const index = (i * (TRAIL_SAMPLES - 1) + j) * 6;
        const start = (i * TRAIL_SAMPLES + a) * 3, end = (i * TRAIL_SAMPLES + b) * 3;
        this.trailPositions.set(this.history.subarray(start, start + 3), index);
        this.trailPositions.set(this.history.subarray(end, end + 3), index + 3);
      }
    }
    this.trails!.geometry.attributes.position.needsUpdate = true;
  }

  render(): void { this.pipeline.render(); }

  pick(clientX: number, clientY: number, state: SimulationState): number | null {
    const rect = this.canvas.getBoundingClientRect();
    let selected: number | null = null, nearest = 14;
    for (let i = 0; i < state.count; i++) {
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
