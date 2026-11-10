import { calculateAccelerations, characteristicTime, createScene, halfMassRadius, type SceneSettings, type SimulationState } from './physics';
import { mergerProperties } from './stellar';

export const SCENARIOS = [
  { id: 'open-cluster', name: 'Open cluster', description: '' },
  { id: 'cold-collapse', name: 'Cold collapse', description: 'Slow initial motions let gravity pull the cluster inward.' },
  { id: 'expanding-association', name: 'Expanding association', description: 'Outward motion disperses a gathering of stars.' },
  { id: 'cluster-encounter', name: 'Cluster smash', description: 'Two compact clusters slam past each other off-centre, scattering stars and igniting merger flashes.' },
  { id: 'runaway-intruder', name: 'Runaway intruder', description: 'A blue-white heavyweight tears through the cluster core, capturing stars and leaving a scattered wake.' },
  { id: 'rotating-cluster', name: 'Rotating cluster', description: 'A shared spin turns the cluster around its centre.' },
  { id: 'flattened-cluster', name: 'Flattened cluster', description: 'A thin stellar gathering evolves under its own gravity.' },
] as const;
export type ScenarioId = typeof SCENARIOS[number]['id'];

/** Illustrative starting conditions; subsequent motion uses the ordinary solver. */
export function createScenario(settings: SceneSettings, seed: number, id: ScenarioId): SimulationState {
  if (!SCENARIOS.some(scenario => scenario.id === id)) throw new Error('Unknown scenario');
  const state = createScene(settings, seed);
  if (id === 'cold-collapse') {
    for (let k = 0; k < state.velocities.length; k++) state.velocities[k] *= 0.2;
  } else if (id === 'expanding-association') {
    const expansion = 1.5 * Math.sqrt(state.initialMass / settings.radius ** 3);
    for (let k = 0; k < state.velocities.length; k++) state.velocities[k] += expansion * state.positions[k];
  } else if (id === 'rotating-cluster') {
    const spin = 0.5 * Math.sqrt(state.initialMass / settings.radius ** 3);
    for (let i = 0; i < state.count; i++) {
      state.velocities[3 * i] += spin * state.positions[3 * i + 2];
      state.velocities[3 * i + 2] -= spin * state.positions[3 * i];
    }
  } else if (id === 'flattened-cluster') {
    for (let i = 0; i < state.count; i++) state.positions[3 * i + 1] *= 0.35;
    recenter(state.positions, state);
    const scale = settings.radius / halfMassRadius(state);
    for (let k = 0; k < state.positions.length; k++) state.positions[k] *= scale;
    calculateAccelerations(state);
  } else if (id === 'runaway-intruder') {
    // An incoming, already-formed remnant carries a third of the combined mass.
    state.masses[0] = 0.5 * (state.initialMass - state.masses[0]);
    state.stars[0] = mergerProperties(state.masses[0]);
    state.initialMass = state.masses.reduce((sum, mass) => sum + mass, 0);
    state.timestep = characteristicTime(state) / 8192;
    let target = 1;
    for (let i = 1; i < state.count; i++) {
      if (state.masses[i] > state.masses[target]) target = i;
      const distance = Math.hypot(...state.positions.subarray(3 * i, 3 * i + 3));
      const compression = 1 / Math.sqrt(1 + (distance / (2 * settings.radius)) ** 2);
      for (let a = 0; a < 3; a++) {
        state.positions[3 * i + a] *= compression;
        state.velocities[3 * i + a] *= 0.35;
      }
    }
    // Aim at a prominent core member; gravity alone determines the actual encounter.
    state.positions.fill(0, 3 * target, 3 * target + 3);
    state.positions.set([-2.5 * settings.radius, 0.12 * settings.radius, 0], 0);
    recenter(state.positions, state);
    const scale = settings.radius / halfMassRadius(state);
    for (let k = 0; k < state.positions.length; k++) state.positions[k] *= scale;
    const approachTime = 0.22 * characteristicTime(state);
    for (let a = 0; a < 3; a++) {
      state.velocities[a] = state.velocities[3 * target + a]
        + (state.positions[3 * target + a] - state.positions[a]) / approachTime;
    }
    calculateAccelerations(state);
  } else if (id === 'cluster-encounter') {
    const split = Math.floor(state.count / 2);
    const speed = 5 * Math.sqrt(state.initialMass / settings.radius);
    for (const [start, end, side] of [[0, split, -1], [split, state.count, 1]]) {
      let mass = 0;
      const center = [0, 0, 0], velocity = [0, 0, 0];
      for (let i = start; i < end; i++) {
        mass += state.masses[i];
        for (let a = 0; a < 3; a++) {
          center[a] += state.masses[i] * state.positions[3 * i + a];
          velocity[a] += state.masses[i] * state.velocities[3 * i + a];
        }
      }
      for (let i = start; i < end; i++) {
        const local = [0, 1, 2].map(a => state.positions[3 * i + a] - center[a] / mass);
        // Bound diffuse Plummer tails so both incoming clusters read as distinct clumps.
        const compression = 0.35 / Math.sqrt(1 + local.reduce((sum, x) => sum + x * x, 0) / (2 * settings.radius) ** 2);
        for (let a = 0; a < 3; a++) {
          const k = 3 * i + a;
          const offset = a === 0 ? 1 : a === 2 ? 0.15 : 0;
          state.positions[k] = compression * local[a] + side * settings.radius * offset;
          state.velocities[k] = state.velocities[k] - velocity[a] / mass - (a === 0 ? side * speed : 0);
        }
      }
    }
    recenter(state.positions, state);
    const scale = settings.radius / halfMassRadius(state);
    for (let k = 0; k < state.positions.length; k++) state.positions[k] *= scale;
    calculateAccelerations(state);
  }
  if (id !== 'open-cluster') recenter(state.velocities, state);
  return state;
}

function recenter(values: Float64Array, state: SimulationState): void {
  for (let a = 0; a < 3; a++) {
    let mean = 0;
    for (let i = 0; i < state.count; i++) mean += state.masses[i] * values[3 * i + a] / state.initialMass;
    for (let i = 0; i < state.count; i++) values[3 * i + a] -= mean;
  }
}
