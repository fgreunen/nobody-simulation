import { expect, it } from 'vitest';
import { SCENARIOS, createScenario } from '../src/scenarios';
import { cloneState, createScene, energy, halfMassRadius, step } from '../src/physics';

it('keeps the original open cluster unchanged', () => {
  expect(createScenario({ count: 100, radius: 1 }, 125, 'open-cluster')).toEqual(createScene());
});

for (const scenario of SCENARIOS.slice(1)) {
  it(`${scenario.name} is reproducible, scaled and barycentric, and evolves with finite mass accounting`, () => {
    for (const seed of [125, 42, 731]) {
      const settings = { count: 32, radius: 1 };
      const state = createScenario(settings, seed, scenario.id);
      expect(state).toEqual(createScenario(settings, seed, scenario.id));
      expect(state.stars).toEqual(createScene(settings, seed).stars);
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
