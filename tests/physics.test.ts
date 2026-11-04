import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SimulationClock, calculateAccelerations, cloneState, createScene, energy, step } from '../src/physics';

describe('Newtonian system', () => {
  it('is deterministic, conserves the configured mass, and resets without sharing arrays', () => {
    const a = createScene(DEFAULT_SETTINGS, 42), b = createScene(DEFAULT_SETTINGS, 42);
    expect(a.positions).toEqual(b.positions);
    expect(a.velocities).toEqual(b.velocities);
    const initial = cloneState(a);
    step(a);
    expect(a.positions).not.toEqual(initial.positions);
    expect(cloneState(initial)).toEqual(b);
    for (const count of [2, 10, 100]) {
      const s = createScene({ ...DEFAULT_SETTINGS, count, totalMass: 3 }, 42);
      expect(s.masses.reduce((sum, m) => sum + m, 0)).toBeCloseTo(3, 12);
    }
  });

  it('applies equal and opposite pair forces, including a moving central body', () => {
    const s = createScene({ ...DEFAULT_SETTINGS, count: 2 }, 7);
    for (let axis = 0; axis < 3; axis++) {
      expect(s.masses[0] * s.accelerations[axis] + s.masses[1] * s.accelerations[axis + 3]).toBeCloseTo(0, 14);
    }
    const before = s.positions.slice(0, 3);
    step(s);
    expect(s.positions.slice(0, 3)).not.toEqual(before);
  });

  it('keeps coincident and very close encounters finite', () => {
    const s = createScene({ ...DEFAULT_SETTINGS, count: 3 }, 3);
    s.positions.fill(0);
    s.positions[3] = 1e-15;
    calculateAccelerations(s);
    for (let i = 0; i < 1000; i++) step(s);
    expect([...s.positions, ...s.velocities, ...s.accelerations].every(Number.isFinite)).toBe(true);
  });

  it('gives equivalent simulated states at 30 and 60 render frames per second', () => {
    const a = createScene(DEFAULT_SETTINGS, 9), b = cloneState(a);
    const ca = new SimulationClock(), cb = new SimulationClock();
    for (let i = 0; i < 300; i++) ca.advance(a, 1 / 30, () => 0);
    for (let i = 0; i < 600; i++) cb.advance(b, 1 / 60, () => 0);
    expect(a.positions).toEqual(b.positions);
    expect(a.velocities).toEqual(b.velocities);
  });

  it('bounds work, discards backlog, and respects pause', () => {
    const s = createScene(DEFAULT_SETTINGS, 9), clock = new SimulationClock();
    clock.speed = 4;
    const advanced = clock.advance(s, 100, () => 0);
    expect(advanced).toBeLessThanOrEqual(64 * s.timestep);
    expect(clock.advance(s, 0, () => 0)).toBe(0);
    clock.paused = true;
    expect(clock.advance(s, 1, () => 0)).toBe(0);
    clock.paused = false;
    let time = 0;
    expect(clock.advance(s, 1, () => (time += 9))).toBe(s.timestep);
  });

  it('rejects invalid settings', () => {
    expect(() => createScene({ ...DEFAULT_SETTINGS, radius: 0 }, 1)).toThrow();
    expect(() => createScene({ ...DEFAULT_SETTINGS, count: 101 }, 1)).toThrow();
  });

  it('holds two-body energy within 0.1% for 100 periods without center drift', () => {
    const s = createScene({ ...DEFAULT_SETTINGS, count: 2 }, 1);
    s.masses.set([0.5, 0.5]);
    s.positions.set([-0.5, 0, 0, 0.5, 0, 0]);
    const omega = Math.sqrt(1 / (1 + s.softening ** 2) ** 1.5);
    s.velocities.set([0, 0, -0.5 * omega, 0, 0, 0.5 * omega]);
    calculateAccelerations(s);
    const initialEnergy = energy(s);
    const iterations = Math.ceil(100 * 2 * Math.PI / omega / s.timestep);
    let maximumDeviation = 0;
    for (let i = 0; i < iterations; i++) {
      step(s);
      if (i % 100 === 0) maximumDeviation = Math.max(maximumDeviation, Math.abs((energy(s) - initialEnergy) / initialEnergy));
    }
    expect(maximumDeviation).toBeLessThan(0.001);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs((s.positions[axis] + s.positions[axis + 3]) / 2)).toBeLessThan(1e-10);
    }
  }, 20000);
});
