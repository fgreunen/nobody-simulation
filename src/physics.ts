import { stellarProperties, mergerProperties, MAX_INITIAL_MASS, type StellarProperties } from './stellar';

/** Solver: pc, solar masses, G=1. One time unit is sqrt(pc³ / G Msun). */
export const G_PC3_MSUN_YEAR2 = 4.49850215e-15;
export const YEARS_PER_UNIT = 1 / Math.sqrt(G_PC3_MSUN_YEAR2);
export const SOLAR_RADIUS_PC = 2.25461015e-8;
export const PC_KM = 3.085677581491367e13;
export const YEAR_SECONDS = 31557600;
export const unitsToYears = (value: number): number => value * YEARS_PER_UNIT;
export const yearsToUnits = (value: number): number => value / YEARS_PER_UNIT;
export const velocityToKmS = (value: number): number => value * PC_KM / (YEARS_PER_UNIT * YEAR_SECONDS);
export const kmSToVelocity = (value: number): number => value * YEARS_PER_UNIT * YEAR_SECONDS / PC_KM;
export interface SceneSettings { count: number; radius: number; }
export const DEFAULT_SETTINGS: SceneSettings = { count: 100, radius: 1 };
export const DEFAULT_SEED = 125;
export interface SimulationState {
  count: number;
  activeCount: number;
  mergedInto: Int32Array;
  radiatedMass: number;
  mergerCount: number;
  bursts: MergerBurst[];
  masses: Float64Array;
  stars: StellarProperties[];
  positions: Float64Array;
  velocities: Float64Array;
  accelerations: Float64Array;
  initialMass: number;
  /** Enlarged dissipative encounter radius per mean-mass star, as a fraction of initial r_half. */
  encounterRadiusScale: number;
  softening: number;
  timestep: number;
  time: number;
  seed: number;
  settings: SceneSettings;
}
export interface MergerBurst { id: number; position: number[]; time: number; radiatedMass: number; }
export const MERGER_MASS_LOSS = 0.01;
export const ENCOUNTER_RADIUS_SCALE = 0.025;
export const characteristicTime = (state: SimulationState): number => Math.sqrt(state.settings.radius ** 3 / state.initialMass);
export const burstLifetime = (state: SimulationState): number => 0.24 * characteristicTime(state);
/** Physical surface, entirely independent of rendering and picking. */
export const stellarRadius = (state: SimulationState, index: number): number => state.masses[index] > 0 ? state.stars[index].radius * SOLAR_RADIUS_PC : 0;
/** Enhanced capture cross-section, separate from physical surface and display size.
 * Fixed initial mean mass avoids feedback as the live population shrinks.
 */
export const encounterRadius = (state: SimulationState, index: number): number => state.masses[index] > 0
  ? Math.max(stellarRadius(state, index), state.settings.radius * state.encounterRadiusScale * Math.cbrt(state.masses[index] / (state.initialMass / state.count))) : 0;
export function survivingBody(state: SimulationState, index: number): number {
  while (state.mergedInto[index] !== index) index = state.mergedInto[index];
  return index;
}
export function inspectBody(state: SimulationState, selected: number | null) {
  if (selected === null) return null;
  const index = survivingBody(state, selected);
  return { index, mass: state.masses[index], ...state.stars[index], encounterRadius: encounterRadius(state, index) };
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
/** Inverse CDF of continuous Kroupa-like dN/dm, slope 1.3 / 2.3 at 0.5 Msun. */
export function sampleMass(random: () => number): number {
  const integral = (a: number, b: number, slope: number) => (b ** (1 - slope) - a ** (1 - slope)) / (1 - slope);
  const low = integral(0.08, 0.5, 1.3), high = 0.5 * integral(0.5, MAX_INITIAL_MASS, 2.3);
  const u = random() * (low + high);
  return u < low ? (0.08 ** -0.3 - 0.3 * u) ** (-1 / 0.3)
    : (0.5 ** -1.3 - 1.3 * (u - low) / 0.5) ** (-1 / 1.3);
}
function direction(random: () => number): number[] {
  const y = 2 * random() - 1, angle = random() * 2 * Math.PI, planar = Math.sqrt(1 - y * y);
  return [planar * Math.cos(angle), y, planar * Math.sin(angle)];
}
export function halfMassRadius(state: SimulationState): number {
  const center = [0, 0, 0], mass = state.masses.reduce((a, b) => a + b, 0);
  for (let i = 0; i < state.count; i++) for (let a = 0; a < 3; a++) center[a] += state.positions[3 * i + a] * state.masses[i] / mass;
  const shells = Array.from(state.masses, (m, i) => ({ m, r: Math.hypot(...center.map((c, a) => state.positions[3 * i + a] - c)) })).sort((a, b) => a.r - b.r);
  let enclosed = 0;
  for (const shell of shells) { enclosed += shell.m; if (enclosed >= mass / 2) return shell.r; }
  return 0;
}
export function createScene(settings: SceneSettings = DEFAULT_SETTINGS, seed = DEFAULT_SEED): SimulationState {
  if (!Number.isInteger(settings.count) || settings.count < 32 || settings.count > 1000 || !Number.isFinite(settings.radius) || settings.radius < 0.5 || settings.radius > 2) throw new Error('Use 32–1000 stars and a 0.5–2 pc half-mass radius');
  const { count, radius } = settings, random = seededRandom(seed);
  const masses = Float64Array.from({ length: count }, () => sampleMass(random));
  const initialMass = masses.reduce((a, b) => a + b, 0);
  const state: SimulationState = {
    count, activeCount: count, masses, stars: Array.from(masses, stellarProperties), initialMass,
    mergedInto: Int32Array.from({ length: count }, (_, i) => i), radiatedMass: 0, mergerCount: 0, bursts: [],
    positions: new Float64Array(count * 3), velocities: new Float64Array(count * 3), accelerations: new Float64Array(count * 3),
    encounterRadiusScale: ENCOUNTER_RADIUS_SCALE, softening: radius * 0.001, timestep: Math.sqrt(radius ** 3 / initialMass) / 8192,
    time: 0, seed, settings: { ...settings },
  };
  for (let i = 0; i < count; i++) {
    // Plummer distribution function; reject r>10a (~1.5% of the infinite model).
    let r: number;
    do { r = 1 / Math.sqrt(Math.max(1e-12, random()) ** (-2 / 3) - 1); } while (r > 10);
    state.positions.set(direction(random).map(x => x * r), 3 * i);
    let q: number;
    do { q = random(); } while (0.1 * random() > q * q * (1 - q * q) ** 3.5);
    const speed = q * Math.sqrt(2 * initialMass / Math.sqrt(1 + r * r));
    state.velocities.set(direction(random).map(x => x * speed), 3 * i);
  }
  for (let axis = 0; axis < 3; axis++) {
    let center = 0, momentum = 0;
    for (let i = 0; i < count; i++) { center += masses[i] * state.positions[3 * i + axis]; momentum += masses[i] * state.velocities[3 * i + axis]; }
    for (let i = 0; i < count; i++) { state.positions[3 * i + axis] -= center / initialMass; state.velocities[3 * i + axis] -= momentum / initialMass; }
  }
  const lengthScale = radius / halfMassRadius(state);
  for (let i = 0; i < state.positions.length; i++) state.positions[i] *= lengthScale;
  calculateAccelerations(state);
  // Scalar virial theorem for the actual softened forces: 2K + W = 0.
  let kinetic = 0, virial = 0;
  for (let i = 0; i < count; i++) for (let a = 0; a < 3; a++) {
    const k = 3 * i + a;
    kinetic += 0.5 * masses[i] * state.velocities[k] ** 2;
    virial += masses[i] * state.positions[k] * state.accelerations[k];
  }
  const velocityScale = Math.sqrt(-virial / (2 * kinetic));
  for (let k = 0; k < state.velocities.length; k++) state.velocities[k] *= velocityScale;
  return state;
}

export function cloneState(state: SimulationState): SimulationState {
  return { ...state, settings: { ...state.settings }, masses: state.masses.slice(), stars: state.stars.map(star => ({ ...star })), mergedInto: state.mergedInto.slice(),
    bursts: state.bursts.map(burst => ({ ...burst, position: [...burst.position] })),
    positions: state.positions.slice(), velocities: state.velocities.slice(), accelerations: state.accelerations.slice() };
}

export function calculateAccelerations(state: SimulationState): void {
  const { count, positions: p, masses: m, accelerations: a, softening } = state;
  a.fill(0);
  const eps2 = softening * softening;
  for (let i = 0; i < count; i++) {
    if (m[i] === 0) continue;
    const k = i * 3;
    for (let j = i + 1; j < count; j++) {
      if (m[j] === 0) continue;
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
  const previous = p.slice();
  for (let i = 0; i < p.length; i++) {
    v[i] += a[i] * h * 0.5;
    p[i] += v[i] * h;
  }
  calculateAccelerations(state);
  for (let i = 0; i < v.length; i++) v[i] += a[i] * h * 0.5;
  state.time += h;
  mergeCloseBodies(state, previous);
  state.bursts = state.bursts.filter(burst => state.time - burst.time < burstLifetime(state));
}

/** Enhanced dissipative capture coalesces at the encounter radius, or at physical contact.
 * Isotropic radiation leaves with the center-of-mass velocity.
 * Swept relative segments catch fast stars that cross between fixed steps.
 */
export function mergeCloseBodies(state: SimulationState, previous = state.positions): void {
  const { masses: m, positions: p, velocities: v } = state;
  const radii = Float64Array.from(m, (_, i) => encounterRadius(state, i));
  let changed = false, again = true, swept = true;
  while (again) {
    again = false;
    for (let i = 0; i < state.count; i++) {
      if (m[i] === 0) continue;
      for (let j = i + 1; j < state.count; j++) {
        if (m[j] === 0) continue;
        const k = i * 3, l = j * 3;
        const x = p[l] - p[k], y = p[l + 1] - p[k + 1], z = p[l + 2] - p[k + 2];
        const sx = swept ? previous[l] - previous[k] : x;
        const sy = swept ? previous[l + 1] - previous[k + 1] : y;
        const sz = swept ? previous[l + 2] - previous[k + 2] : z;
        const dx = x - sx, dy = y - sy, dz = z - sz;
        const length2 = dx * dx + dy * dy + dz * dz;
        const t = length2 > 0 ? Math.max(0, Math.min(1, -(sx * dx + sy * dy + sz * dz) / length2)) : 0;
        if ((sx + t * dx) ** 2 + (sy + t * dy) ** 2 + (sz + t * dz) ** 2 > (radii[i] + radii[j]) ** 2) continue;
        // Limit radiation to the interacting mass so swallowing a small star still grows the remnant.
        const total = m[i] + m[j], loss = 2 * Math.min(m[i], m[j]) * MERGER_MASS_LOSS;
        for (let axis = 0; axis < 3; axis++) {
          p[k + axis] = (m[i] * p[k + axis] + m[j] * p[l + axis]) / total;
          v[k + axis] = (m[i] * v[k + axis] + m[j] * v[l + axis]) / total;
          v[l + axis] = 0;
          // The merged trajectory replaces both swept paths for subsequent pairs.
          previous[k + axis] = p[k + axis];
        }
        m[i] = total - loss; m[j] = 0;
        state.stars[i] = mergerProperties(m[i]);
        radii[i] = encounterRadius(state, i);
        state.mergedInto[j] = i;
        state.activeCount--; state.radiatedMass += loss;
        state.bursts.push({ id: ++state.mergerCount, position: Array.from(p.subarray(k, k + 3)), time: state.time, radiatedMass: loss });
        changed = again = true;
      }
    }
    swept = false;
  }
  if (changed) calculateAccelerations(state);
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

export class SimulationClock {
  private accumulator = 0;
  speed = 1;
  paused = false;
  clear(): void { this.accumulator = 0; }
  requestedRate(state: SimulationState): number { return characteristicTime(state) / 60 * this.speed; }
  advance(state: SimulationState, realSeconds: number, now: () => number = performance.now.bind(performance)): number {
    if (this.paused || realSeconds <= 0) return 0;
    this.accumulator += Math.min(realSeconds, 0.25) * this.requestedRate(state);
    const start = now();
    let steps = 0;
    while (this.accumulator + 1e-12 >= state.timestep && steps < 64) {
      if (steps > 0 && now() - start >= 8) break;
      step(state); this.accumulator -= state.timestep; steps++;
    }
    if (this.accumulator >= state.timestep) this.accumulator %= state.timestep;
    return steps * state.timestep;
  }
}
