import { expect, it } from 'vitest';
import { SCENARIOS, createScenario } from '../src/scenarios';
import { calculateAccelerations, cloneState, createScene, energy, halfMassRadius, step } from '../src/physics';
import { mergerProperties } from '../src/stellar';

it('keeps the original open cluster unchanged', () => {
  expect(createScenario({ count: 100, radius: 1 }, 125, 'open-cluster')).toEqual(createScene());
});

for (const scenario of SCENARIOS.slice(1)) {
  it(`${scenario.name} is reproducible, scaled and barycentric, and evolves with finite mass accounting`, () => {
    for (const seed of [125, 42, 731]) {
      const settings = { count: 32, radius: 1 };
      const state = createScenario(settings, seed, scenario.id);
      expect(state).toEqual(createScenario(settings, seed, scenario.id));
      const original = createScene(settings, seed);
      const start = scenario.id === 'runaway-intruder' ? 1 : 0;
      expect(state.stars.slice(start)).toEqual(original.stars.slice(start));
      expect(state.masses.slice(start)).toEqual(original.masses.slice(start));
      expect(halfMassRadius(state)).toBeCloseTo(1, 12);
      for (const values of [state.positions, state.velocities]) for (let a = 0; a < 3; a++) {
        expect(state.masses.reduce((sum, m, i) => sum + m * values[3 * i + a], 0)).toBeCloseTo(0, 11);
      }
      const larger = createScenario({ ...settings, radius: 2 }, seed, scenario.id);
      expect(halfMassRadius(larger)).toBeCloseTo(2, 12);
      for (let k = 0; k < state.positions.length; k++) {
        expect(larger.positions[k]).toBeCloseTo(2 * state.positions[k], 11);
        expect(larger.velocities[k]).toBeCloseTo(state.velocities[k] / Math.sqrt(2), 11);
      }
      for (let i = 0; i < 8192; i++) step(state);
      expect([...state.positions, ...state.velocities, ...state.accelerations].every(Number.isFinite)).toBe(true);
      expect(state.masses.reduce((sum, m) => sum + m, 0) + state.radiatedMass).toBeCloseTo(state.initialMass, 10);
      expect(state.activeCount).toBeGreaterThan(0);
    }
  });

  it(`${scenario.name} agrees with a half-step gravity control over the initial eighth-timescale`, () => {
    const full = createScenario({ count: 32, radius: 1 }, 125, scenario.id);
    full.encounterRadiusScale = 0;
    const half = cloneState(full), initialEnergy = energy(full);
    half.timestep /= 2;
    for (let i = 0; i < 1024; i++) {
      step(full);
      step(half); step(half);
    }
    expect(Math.abs((energy(full) - initialEnergy) / initialEnergy)).toBeLessThan(1e-4);
    expect(Math.max(...full.positions.map((p, k) => Math.abs(p - half.positions[k])))).toBeLessThan(1e-4);
  });
}

it('starts collapse, expansion and approach in the described directions', () => {
  for (const id of ['cold-collapse', 'expanding-association', 'cluster-encounter'] as const) {
    const state = createScenario({ count: 100, radius: 1 }, 125, id);
    state.encounterRadiusScale = 0;
    const separation = () => {
      const centers = [0, 50].map(start => {
        let mass = 0, center = 0;
        for (let i = start; i < start + 50; i++) { mass += state.masses[i]; center += state.masses[i] * state.positions[3 * i]; }
        return center / mass;
      });
      return centers[1] - centers[0];
    };
    const before = id === 'cluster-encounter' ? separation() : halfMassRadius(state);
    for (let i = 0; i < 1024; i++) step(state);
    const after = id === 'cluster-encounter' ? separation() : halfMassRadius(state);
    if (id === 'expanding-association') expect(after).toBeGreaterThan(before);
    else expect(after).toBeLessThan(before);
  }
});

it('adds angular momentum around the rotating cluster’s vertical axis', () => {
  for (const seed of [125, 42, 731]) {
    const original = createScene({ count: 100, radius: 1 }, seed);
    const rotating = createScenario(original.settings, seed, 'rotating-cluster');
    const angularMomentum = (state: typeof original) => state.masses.reduce((sum, mass, i) =>
      sum + mass * (state.positions[3 * i + 2] * state.velocities[3 * i] - state.positions[3 * i] * state.velocities[3 * i + 2]), 0);
    expect(rotating.positions).toEqual(original.positions);
    expect(angularMomentum(rotating)).toBeGreaterThan(Math.abs(angularMomentum(original)));
  }
});

it('smashes distinct off-centre clumps together quickly and leaves an expanding aftermath', () => {
  for (const seed of [125, 42, 731]) {
    const state = createScenario({ count: 100, radius: 1 }, seed, 'cluster-encounter');
    const centers = [0, 50].map(start => {
      const center = [0, 0, 0];
      let mass = 0;
      for (let i = start; i < start + 50; i++) {
        mass += state.masses[i];
        for (let a = 0; a < 3; a++) center[a] += state.masses[i] * state.positions[3 * i + a];
      }
      return center.map(x => x / mass);
    });
    expect(centers[0][0]).toBeLessThan(-0.5);
    expect(centers[1][0]).toBeGreaterThan(0.5);
    expect(Math.abs(centers[1][2] - centers[0][2])).toBeGreaterThan(0.1);
    const radii: number[] = [], mergers: number[] = [];
    for (let frame = 0; frame < 4; frame++) {
      for (let i = 0; i < 2048; i++) step(state);
      radii.push(halfMassRadius(state)); mergers.push(state.mergerCount);
    }
    expect(radii[0]).toBeLessThan(0.6);
    expect(radii[3]).toBeGreaterThan(2);
    expect(mergers[1]).toBeGreaterThanOrEqual(5);
    expect([...state.positions, ...state.velocities].every(Number.isFinite)).toBe(true);
    expect(state.masses.reduce((sum, m) => sum + m, 0) + state.radiatedMass).toBeCloseTo(state.initialMass, 10);
  }
});

it('flattens the vertical extent and initializes gravity for the changed positions', () => {
  for (const seed of [125, 42, 731]) {
    const original = createScene({ count: 100, radius: 1 }, seed);
    const flattened = createScenario(original.settings, seed, 'flattened-cluster');
    const thickness = (state: typeof original) => {
      let vertical = 0, planar = 0;
      for (let i = 0; i < state.count; i++) {
        vertical += state.masses[i] * state.positions[3 * i + 1] ** 2;
        planar += state.masses[i] * (state.positions[3 * i] ** 2 + state.positions[3 * i + 2] ** 2);
      }
      return Math.sqrt(vertical / planar);
    };
    expect(thickness(flattened) / thickness(original)).toBeCloseTo(0.35, 12);
    const recalculated = cloneState(flattened);
    calculateAccelerations(recalculated);
    expect(flattened.accelerations).toEqual(recalculated.accelerations);
  }
});

it.each([125, 42, 731])('sends a massive remnant through the core and disrupts its neighbours (seed %i)', seed => {
  const state = createScenario({ count: 100, radius: 1 }, seed, 'runaway-intruder');
  const intruderMass = state.masses[0];
  expect(intruderMass / state.initialMass).toBeCloseTo(1 / 3, 12);
  expect(state.stars[0]).toEqual(mergerProperties(intruderMass));
  expect(state.timestep).toBeCloseTo(Math.sqrt(1 / state.initialMass) / 8192, 15);
  const control = cloneState(state);
  control.masses[0] = 0; control.activeCount--;
  calculateAccelerations(control);
  const initial = state.positions[0];
  for (let i = 0; i < 4096; i++) { step(state); step(control); }
  const velocityScale = Math.sqrt(state.initialMass);
  let disturbed = 0;
  for (let i = 1; i < state.count; i++) {
    if (state.masses[i] > 0 && control.masses[i] > 0
      && Math.hypot(...[0, 1, 2].map(a => state.velocities[3 * i + a] - control.velocities[3 * i + a])) > 0.2 * velocityScale) disturbed++;
  }
  expect(state.positions[0]).toBeGreaterThan(initial + 1);
  expect(state.masses[0]).toBeGreaterThan(intruderMass);
  expect(disturbed).toBeGreaterThanOrEqual(3);
  expect(state.bursts.length).toBeGreaterThan(0);
  expect([...state.positions, ...state.velocities, ...state.accelerations].every(Number.isFinite)).toBe(true);
  expect(state.masses.reduce((sum, m) => sum + m, 0) + state.radiatedMass).toBeCloseTo(state.initialMass, 10);
});
