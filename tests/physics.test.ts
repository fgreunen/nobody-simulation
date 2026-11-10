import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { appearance } from '../src/appearance';
import { mergerProperties } from '../src/stellar';
import { DEFAULT_SETTINGS, DEFAULT_SEED, G_PC3_MSUN_YEAR2, YEARS_PER_UNIT, SOLAR_RADIUS_PC, SimulationClock, burstLifetime, calculateAccelerations, characteristicTime, cloneState, createScene, encounterRadius, energy, halfMassRadius, inspectBody, kmSToVelocity, mergeCloseBodies, stellarRadius, step, survivingBody, unitsToYears, yearsToUnits, velocityToKmS } from '../src/physics';

function pair(masses = [1, 1]) {
  const s = createScene();
  s.encounterRadiusScale = 0;
  s.count = s.activeCount = 2; s.masses = Float64Array.from(masses); s.stars = masses.map(mergerProperties);
  s.initialMass = masses[0] + masses[1]; s.mergedInto = new Int32Array([0, 1]);
  s.positions = new Float64Array([-0.5, 0, 0, 0.5, 0, 0]);
  s.velocities = new Float64Array(6); s.accelerations = new Float64Array(6); s.softening = 0;
  return s;
}
function center(s: ReturnType<typeof createScene>) {
  return [0, 1, 2].map(a => s.masses.reduce((sum, m, i) => sum + m * s.positions[3 * i + a], 0) / s.initialMass);
}
function boundFraction(s: ReturnType<typeof createScene>): number {
  let bound = 0;
  for (let i = 0; i < s.count; i++) {
    let specific = 0.5 * s.velocities.slice(3 * i, 3 * i + 3).reduce((sum, v) => sum + v * v, 0);
    for (let j = 0; j < s.count; j++) if (i !== j) {
      const d2 = [0, 1, 2].reduce((sum, a) => sum + (s.positions[3 * i + a] - s.positions[3 * j + a]) ** 2, s.softening ** 2);
      specific -= s.masses[j] / Math.sqrt(d2);
    }
    if (specific < 0) bound++;
  }
  return bound / s.count;
}
describe('physical population and generation', () => {
  it('has a reproducible default, exact weighted extent, conserved sum and no bulk motion', () => {
    const a = createScene(), b = createScene(DEFAULT_SETTINGS, DEFAULT_SEED);
    expect(a).toEqual(b); expect(a.count).toBe(100); expect(halfMassRadius(a)).toBeCloseTo(1, 13);
    expect(a.initialMass).toBe(a.masses.reduce((x, y) => x + y, 0));
    expect(a.masses.every(m => m >= 0.08 && m <= 4.5)).toBe(true);
    expect(a.stars.some(s => s.kind === 'pre-main-sequence star')).toBe(true);
    for (let axis = 0; axis < 3; axis++) {
      expect(center(a)[axis]).toBeCloseTo(0, 13);
      expect(a.masses.reduce((sum, m, i) => sum + m * a.velocities[3 * i + axis], 0)).toBeCloseTo(0, 12);
    }
    expect([...a.positions, ...a.velocities, ...a.accelerations].every(Number.isFinite)).toBe(true);
    let kinetic = 0, virial = 0;
    for (let i = 0; i < a.count; i++) for (let axis = 0; axis < 3; axis++) { const k = 3 * i + axis; kinetic += 0.5 * a.masses[i] * a.velocities[k] ** 2; virial += a.masses[i] * a.positions[k] * a.accelerations[k]; }
    expect(kinetic / -virial).toBeCloseTo(0.5, 13);
    const variation = createScene(DEFAULT_SETTINGS, 42); expect(variation.positions).not.toEqual(a.positions);
  });
  it('samples a continuous low-mass-weighted ensemble without guaranteed high-mass stars', () => {
    const samples = Array.from({ length: 32 }, (_, seed) => createScene(DEFAULT_SETTINGS, seed));
    const masses = samples.flatMap(s => [...s.masses]);
    expect(masses.filter(m => m < 0.5).length / masses.length).toBeGreaterThan(0.7);
    expect(masses.filter(m => m > 2).length / masses.length).toBeLessThan(0.05);
    expect(masses.some(m => m > 3)).toBe(true);
    expect(samples.some(s => Math.max(...s.masses) < 2)).toBe(true);
    expect(new Set(masses).size).toBe(masses.length);
  });
  it('checks supported controls and rescales size without rescaling stellar masses', () => {
    for (const count of [31, 1001, 2.5, NaN]) expect(() => createScene({ count, radius: 1 })).toThrow();
    for (const radius of [0, 0.49, 2.01, Infinity]) expect(() => createScene({ count: 100, radius })).toThrow();
    const a = createScene(), b = createScene({ count: 100, radius: 2 });
    expect(b.masses).toEqual(a.masses); expect(b.stars).toEqual(a.stars);
    expect(halfMassRadius(b)).toBeCloseTo(2, 13);
    expect(characteristicTime(b) / characteristicTime(a)).toBeCloseTo(Math.sqrt(8), 13);
    expect(b.positions[0] / a.positions[0]).toBeCloseTo(2, 13);
    expect(b.velocities[0] / a.velocities[0]).toBeCloseTo(1 / Math.sqrt(2), 13);
    expect(createScene({ count: 32, radius: 0.5 }).count).toBe(32);
    expect(createScene({ count: 1000, radius: 2 }).count).toBe(1000);
  });
});
describe('units and gravity', () => {
  it('retains stronger close-range gravity with reduced, extent-scaled softening', () => {
    const generated = createScene();
    const larger = createScene({ count: 100, radius: 2 });
    expect(generated.softening).toBe(0.001);
    expect(larger.softening).toBe(0.002);
    const s = pair();
    s.positions.set([0, 0, 0, 0.001, 0, 0]);
    s.softening = generated.softening; calculateAccelerations(s);
    const reduced = s.accelerations[0];
    // At separation epsilon, Plummer gravity is Newtonian gravity / sqrt(8).
    expect(reduced).toBeCloseTo(1e6 / Math.sqrt(8), 7);
    s.softening = 0.01; calculateAccelerations(s);
    expect(reduced / s.accelerations[0]).toBeGreaterThan(350);
  });
  it('round trips physical time and velocity and reproduces calibrated acceleration', () => {
    expect(yearsToUnits(unitsToYears(1.23))).toBeCloseTo(1.23, 14);
    expect(kmSToVelocity(velocityToKmS(2.34))).toBeCloseTo(2.34, 14);
    const s = pair(); calculateAccelerations(s);
    expect(s.accelerations[0] / YEARS_PER_UNIT ** 2).toBeCloseTo(G_PC3_MSUN_YEAR2, 25);
    expect(stellarRadius(s, 0) / s.stars[0].radius).toBe(SOLAR_RADIUS_PC);
    s.masses[1] = 2; calculateAccelerations(s); expect(s.accelerations[0]).toBe(2); expect(s.accelerations[3]).toBe(-1);
  });
  it('integrates an analytic freely moving two-body orbit and converges', () => {
    const errors: number[] = [];
    for (const n of [512, 1024]) {
      const s = pair(), period = 2 * Math.PI / Math.sqrt(2), speed = 1 / Math.sqrt(2);
      s.velocities.set([0, speed, 0, 0, -speed, 0]); s.timestep = period / n; calculateAccelerations(s);
      const e = energy(s);
      for (let i = 0; i < n; i++) step(s);
      errors.push(Math.hypot(s.positions[0] + 0.5, s.positions[1]));
      expect(Math.abs((energy(s) - e) / e)).toBeLessThan(1e-7);
      expect(s.activeCount).toBe(2); expect(center(s).every(x => Math.abs(x) < 1e-13)).toBe(true);
    }
    expect(errors[1]).toBeLessThan(errors[0] / 3.8);
  });
});
describe('physical collisions and reset', () => {
  it('keeps overlapping display glows separate, with no display influence on dynamics', () => {
    const s = pair(); s.positions.set([0, 0, 0, 0.001, 0, 0]);
    expect(appearance(s.stars[0]).radius).toBeGreaterThan(0.001);
    mergeCloseBodies(s); expect(s.activeCount).toBe(2);
    const b = cloneState(s); for (const star of s.stars) { appearance({ ...star, luminosity: star.luminosity * 100 }); }
    calculateAccelerations(s); calculateAccelerations(b); step(s); step(b); expect(s.positions).toEqual(b.positions);
  });
  it('accounts for mass, radiation, centre and momentum at contact, and transfers inspection', () => {
    const s = pair([1, 0.1]); const initial = cloneState(s), r = stellarRadius(s, 0) + stellarRadius(s, 1);
    s.positions.set([0, 0, 0, r * 0.9, 0, 0]); s.velocities.set([2, 4, 0, -1, 0, 2]);
    mergeCloseBodies(s);
    expect(s.activeCount).toBe(1); expect(s.masses[0]).toBeCloseTo(1.098, 13); expect(s.radiatedMass).toBeCloseTo(0.002, 14);
    expect(s.positions[0]).toBeCloseTo(r * 0.9 / 11, 20);
    for (let a = 0; a < 3; a++) expect((s.masses[0] + s.radiatedMass) * s.velocities[a]).toBeCloseTo([1.9, 4, 0.2][a], 13);
    expect(s.stars[0]).toEqual(mergerProperties(1.098)); expect(s.bursts).toHaveLength(1);
    expect(survivingBody(s, 1)).toBe(0); expect(inspectBody(s, 1)?.mass).toBe(s.masses[0]); expect(inspectBody(s, null)).toBeNull();
    const reset = cloneState(initial); expect(reset).toEqual(initial); expect(reset.stars[0]).not.toBe(initial.stars[0]); expect(reset.bursts).toEqual([]);
  });
  it('handles equal, unequal and repeated mergers beyond the generation table without clamping', () => {
    for (const masses of [[1, 1], [4.5, 0.08], [0.08, 4.5], [4.5, 4.5]]) {
      const s = pair(masses); s.positions.fill(0); mergeCloseBodies(s);
      expect(s.masses[0]).toBeGreaterThan(Math.max(...masses));
      expect(s.masses[0] + s.radiatedMass).toBeCloseTo(masses[0] + masses[1], 12);
      expect(s.stars[0].kind).toBe('merger remnant'); expect(Number.isFinite(s.stars[0].temperature)).toBe(true);
    }
    const s = createScene(); s.positions.fill(0); mergeCloseBodies(s);
    expect(s.activeCount).toBe(1); expect(s.masses[0]).toBeGreaterThan(4.5);
    expect(s.masses[0] + s.radiatedMass).toBeCloseTo(s.initialMass, 11);
    expect(survivingBody(s, 99)).toBe(0);
  });
  it('detects swept crossings and expires bursts in simulated time', () => {
    const s = pair(); s.softening = 0.01; s.positions.set([-0.1, 0, 0, 0.1, 0, 0]);
    s.velocities.set([20, 0, 0, -20, 0, 0]); s.timestep = 0.01; calculateAccelerations(s); step(s);
    expect(s.activeCount).toBe(1); expect(s.bursts).toHaveLength(1);
    s.timestep = burstLifetime(s) * 1.1; step(s); expect(s.bursts).toEqual([]);
  });
});
describe('bounded playback', () => {
  it('reports requested rate, achieved advancement, pause and discarded overload independently', () => {
    const s = createScene(), c = new SimulationClock(), start = s.time;
    expect(c.requestedRate(s) * 60).toBe(characteristicTime(s));
    const advanced = c.advance(s, 1 / 60, () => 0); expect(s.time - start).toBeCloseTo(advanced, 14);
    expect(advanced).toBeGreaterThan(0); expect(Math.abs(advanced - c.requestedRate(s) / 60)).toBeLessThan(s.timestep);
    c.paused = true; expect(c.advance(s, 1)).toBe(0); c.paused = false; c.speed = 4;
    let now = 0; const limited = c.advance(s, 10, () => now += 9); expect(limited).toBe(s.timestep);
    c.clear(); expect(c.advance(s, 0)).toBe(0);
    expect(c.advance(s, 0.25, () => 0)).toBeLessThanOrEqual(s.timestep * 64);
  });
});
it('retains a near-equilibrium cluster across five dynamical times and converges', () => {
  const results = [];
  for (const seed of [DEFAULT_SEED, 42, 731]) {
    const runs = [];
    for (const divisor of [1, 2]) {
      const s = createScene(DEFAULT_SETTINGS, seed);
      // Conservative-gravity control: disable the explicitly dissipative enhancement.
      s.encounterRadiusScale = 0;
      const e0 = energy(s), duration = characteristicTime(s) * 5;
      s.timestep /= divisor;
      let minRh = 1, maxRh = 1, maxEnergyDrift = 0, minBound = 1;
      for (let i = 1; i <= Math.round(duration / s.timestep); i++) {
        step(s);
        if (i % Math.round(characteristicTime(s) / (4 * s.timestep)) === 0) {
          const rh = halfMassRadius(s); minRh = Math.min(minRh, rh); maxRh = Math.max(maxRh, rh);
          maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs((energy(s) - e0) / e0)); minBound = Math.min(minBound, boundFraction(s));
        }
      }
      const run = { seed, divisor, years: unitsToYears(duration), minRh, maxRh, finalRh: halfMassRadius(s), maxEnergyDrift, minBound, centerDrift: Math.hypot(...center(s)) };
      runs.push(run);
      expect(s.time).toBeCloseTo(duration, 9);
      expect([...s.positions, ...s.velocities, ...s.accelerations].every(Number.isFinite)).toBe(true);
      expect(minRh).toBeGreaterThan(0.5); expect(maxRh).toBeLessThan(2); expect(minBound).toBeGreaterThanOrEqual(0.8);
      expect(maxEnergyDrift).toBeLessThan(0.005); expect(run.centerDrift).toBeLessThan(1e-10);
    }
    expect(Math.abs(runs[0].finalRh / runs[1].finalRh - 1)).toBeLessThan(0.05);
    expect(Math.abs(runs[0].minBound - runs[1].minBound)).toBeLessThanOrEqual(0.05);
    expect(runs[1].maxEnergyDrift).toBeLessThan(Math.max(1e-5, runs[0].maxEnergyDrift));
    results.push(...runs);
  }
  mkdirSync('verification-results', { recursive: true }); writeFileSync('verification-results/cluster-evolution.json', JSON.stringify(results, null, 2));
}, 240000);

describe('enhanced close-encounter capture', () => {
  it('captures within a mass-scaled radius without requiring unstable numerics', () => {
    const s = pair([1, 1]); s.encounterRadiusScale = 0.02;
    expect(encounterRadius(s, 0)).toBeCloseTo(0.02, 14);
    s.positions.set([0, 0, 0, 0.039, 0, 0]);
    const initial = cloneState(s);
    mergeCloseBodies(s);
    expect(s.activeCount).toBe(1); expect(s.mergerCount).toBe(1);
    expect(s.masses[0] + s.radiatedMass).toBeCloseTo(2, 14);
    expect(stellarRadius(s, 0)).toBeLessThan(1e-6);
    expect(survivingBody(s, 1)).toBe(0);
    expect(inspectBody(s, 1)?.encounterRadius).toBe(encounterRadius(s, 0));
    expect(cloneState(initial)).toEqual(initial);
    const outside = pair(); outside.encounterRadiusScale = 0.02;
    outside.positions.set([0, 0, 0, 0.041, 0, 0]); mergeCloseBodies(outside);
    expect(outside.activeCount).toBe(2);
    outside.masses[0] = 8;
    expect(encounterRadius(outside, 0)).toBeCloseTo(0.04, 14);
    const expanded = cloneState(outside); expanded.settings.radius = 2;
    expect(encounterRadius(expanded, 0)).toBeCloseTo(0.08, 14);
  });
  it('detects swept capture encounters even when endpoints remain outside', () => {
    const s = pair(); s.encounterRadiusScale = 0.02;
    const previous = new Float64Array([-0.1, 0, 0, 0.1, 0, 0]);
    s.positions.set([0.1, 0, 0, -0.1, 0, 0]); mergeCloseBodies(s, previous);
    expect(s.activeCount).toBe(1);
  });
  it('produces several events within one normal playback minute across deterministic realizations', () => {
    const measurements = [];
    for (const seed of [125, 42, 731]) {
      const s = createScene(DEFAULT_SETTINGS, seed), original = cloneState(s), horizon = characteristicTime(s);
      let firstTime = Infinity;
      for (let i = 0; i < Math.round(horizon / s.timestep); i++) {
        step(s); if (s.mergerCount && firstTime === Infinity) firstTime = s.time;
      }
      const measurement = { seed, mergers: s.mergerCount, firstEventAtNormalSeconds: 60 * firstTime / horizon, activeCount: s.activeCount };
      measurements.push(measurement);
      mkdirSync('verification-results', { recursive: true }); writeFileSync('verification-results/enhanced-mergers.json', JSON.stringify(measurements, null, 2));
      expect(s.mergerCount).toBeGreaterThanOrEqual(3); expect(s.mergerCount).toBeLessThan(25);
      expect(measurement.firstEventAtNormalSeconds).toBeLessThan(20);
      expect([...s.positions, ...s.velocities, ...s.accelerations].every(Number.isFinite)).toBe(true);
      expect(s.activeCount).toBe(s.count - s.mergerCount);
      expect(s.masses.reduce((a, b) => a + b, 0) + s.radiatedMass).toBeCloseTo(s.initialMass, 10);
      const reset = cloneState(original); expect(reset.mergerCount).toBe(0); expect(reset.activeCount).toBe(100);
      expect(reset.stars).toEqual(original.stars); expect(reset.encounterRadiusScale).toBe(0.025);
    }
  }, 60000);
});
