/** Normalized units: G = 1. Rendering never owns or mutates these arrays. */
export interface SceneSettings {
  count: number;
  totalMass: number;
  radius: number;
  centralShare: number;
  orbitalSpeed: number;
}

export const DEFAULT_SETTINGS: SceneSettings = {
  count: 100, totalMass: 1, radius: 1, centralShare: 0.95, orbitalSpeed: 1,
};

export interface SimulationState {
  count: number;
  masses: Float64Array;
  positions: Float64Array;
  velocities: Float64Array;
  accelerations: Float64Array;
  softening: number;
  timestep: number;
  time: number;
  seed: number;
  settings: SceneSettings;
}

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let x = value;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createScene(settings: SceneSettings, seed: number): SimulationState {
  if (!Number.isInteger(settings.count) || settings.count < 2 || settings.count > 100 ||
    ![settings.totalMass, settings.radius, settings.centralShare, settings.orbitalSpeed].every(Number.isFinite) ||
    settings.totalMass <= 0 || settings.radius <= 0 || settings.centralShare <= 0 || settings.centralShare >= 1 || settings.orbitalSpeed <= 0) {
    throw new Error('Invalid scene settings');
  }
  const { count, totalMass, radius, centralShare, orbitalSpeed } = settings;
  const state: SimulationState = {
    count, masses: new Float64Array(count), positions: new Float64Array(count * 3),
    velocities: new Float64Array(count * 3), accelerations: new Float64Array(count * 3),
    softening: radius * 0.02, timestep: Math.sqrt(radius ** 3 / totalMass) / 1024,
    time: 0, seed, settings: { ...settings },
  };
  const random = seededRandom(seed);
  state.masses[0] = totalMass * centralShare;
  for (let i = 1; i < count; i++) {
    state.masses[i] = totalMass * (1 - centralShare) / (count - 1);
    const r = radius * (0.35 + 1.45 * Math.sqrt(random()));
    const angle = random() * Math.PI * 2;
    const inclination = (random() - 0.5) * 0.16;
    const x = Math.cos(angle), z = Math.sin(angle);
    state.positions[i * 3] = r * x;
    state.positions[i * 3 + 1] = r * z * Math.sin(inclination);
    state.positions[i * 3 + 2] = r * z * Math.cos(inclination);
    const speed = Math.sqrt(state.masses[0] * r * r / (r * r + state.softening ** 2) ** 1.5) * orbitalSpeed;
    state.velocities[i * 3] = -speed * z;
    state.velocities[i * 3 + 1] = speed * x * Math.sin(inclination);
    state.velocities[i * 3 + 2] = speed * x * Math.cos(inclination);
  }
  // Work in the barycentric frame without pinning the massive body.
  for (let axis = 0; axis < 3; axis++) {
    let center = 0, momentum = 0;
    for (let i = 0; i < count; i++) {
      center += state.positions[i * 3 + axis] * state.masses[i];
      momentum += state.velocities[i * 3 + axis] * state.masses[i];
    }
    for (let i = 0; i < count; i++) {
      state.positions[i * 3 + axis] -= center / totalMass;
      state.velocities[i * 3 + axis] -= momentum / totalMass;
    }
  }
  calculateAccelerations(state);
  return state;
}

export function cloneState(state: SimulationState): SimulationState {
  return { ...state, settings: { ...state.settings }, masses: state.masses.slice(),
    positions: state.positions.slice(), velocities: state.velocities.slice(), accelerations: state.accelerations.slice() };
}

export function calculateAccelerations(state: SimulationState): void {
  const { count, positions: p, masses: m, accelerations: a, softening } = state;
  a.fill(0);
  const eps2 = softening * softening;
  for (let i = 0; i < count; i++) {
    const k = i * 3;
    for (let j = i + 1; j < count; j++) {
      const l = j * 3;
      const dx = p[l] - p[k], dy = p[l + 1] - p[k + 1], dz = p[l + 2] - p[k + 2];
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      const inverseCube = 1 / (r2 * Math.sqrt(r2));
      const ai = m[j] * inverseCube, aj = m[i] * inverseCube;
      a[k] += dx * ai; a[k + 1] += dy * ai; a[k + 2] += dz * ai;
      a[l] -= dx * aj; a[l + 1] -= dy * aj; a[l + 2] -= dz * aj;
    }
  }
}

export function step(state: SimulationState): void {
  const { positions: p, velocities: v, accelerations: a, timestep: h } = state;
  for (let i = 0; i < p.length; i++) {
    v[i] += a[i] * h * 0.5;
    p[i] += v[i] * h;
  }
  calculateAccelerations(state);
  for (let i = 0; i < v.length; i++) v[i] += a[i] * h * 0.5;
  state.time += h;
}

export function energy(state: SimulationState): number {
  let value = 0;
  const { count, positions: p, velocities: v, masses: m, softening } = state;
  for (let i = 0; i < count; i++) {
    const k = i * 3;
    value += 0.5 * m[i] * (v[k] ** 2 + v[k + 1] ** 2 + v[k + 2] ** 2);
    for (let j = i + 1; j < count; j++) {
      const l = j * 3;
      value -= m[i] * m[j] / Math.sqrt((p[l] - p[k]) ** 2 + (p[l + 1] - p[k + 1]) ** 2 + (p[l + 2] - p[k + 2]) ** 2 + softening ** 2);
    }
  }
  return value;
}

// At default settings an orbit of radius 1 around the central body lasts ~45 s.
export const SIMULATION_UNITS_PER_SECOND = 2 * Math.PI / (45 * Math.sqrt(0.95));

export class SimulationClock {
  private accumulator = 0;
  speed = 1;
  paused = false;
  clear(): void { this.accumulator = 0; }

  advance(state: SimulationState, realSeconds: number, now: () => number = performance.now.bind(performance)): number {
    if (this.paused || realSeconds <= 0) return 0;
    // A stalled/background frame cannot request an unbounded catch-up.
    this.accumulator += Math.min(realSeconds, 0.25) * SIMULATION_UNITS_PER_SECOND * this.speed;
    const start = now();
    let steps = 0;
    while (this.accumulator + 1e-12 >= state.timestep && steps < 64) {
      if (steps > 0 && now() - start >= 8) break;
      step(state);
      this.accumulator -= state.timestep;
      steps++;
    }
    // Keep only the fractional step; never spend future frames repaying overload.
    if (this.accumulator >= state.timestep) this.accumulator %= state.timestep;
    return steps * state.timestep;
  }
}
