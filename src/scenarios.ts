import { calculateAccelerations, createScene, halfMassRadius, type SceneSettings, type SimulationState } from './physics';

export const SCENARIOS = [
  { id: 'open-cluster', name: 'Open cluster', description: '' },
  { id: 'cold-collapse', name: 'Cold collapse', description: 'Slow initial motions let gravity pull the cluster inward.' },
  { id: 'expanding-association', name: 'Expanding association', description: 'Outward motion disperses a gathering of stars.' },
  { id: 'cluster-encounter', name: 'Two clusters meeting', description: 'Two stellar clumps approach head-on under mutual gravity.' },
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
  } else if (id === 'cluster-encounter') {
    const split = Math.floor(state.count / 2);
    const speed = 0.5 * Math.sqrt(state.initialMass / settings.radius);
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
      for (let i = start; i < end; i++) for (let a = 0; a < 3; a++) {
        const k = 3 * i + a;
        state.positions[k] = 0.25 * (state.positions[k] - center[a] / mass) + (a === 0 ? side * settings.radius : 0);
        state.velocities[k] = state.velocities[k] - velocity[a] / mass - (a === 0 ? side * speed : 0);
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
