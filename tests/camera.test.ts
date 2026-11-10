import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { CameraRig } from '../src/camera';
import { createScene, DEFAULT_SETTINGS, mergeCloseBodies } from '../src/physics';
import type { UniverseView } from '../src/universe';

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = new Vector3();
    enabled = true;
    addEventListener() {}
    update() {}
  },
}));

function setup() {
  const state = createScene(DEFAULT_SETTINGS, 42);
  const camera = new PerspectiveCamera();
  const view = { camera, canvas: { clientHeight: 720, addEventListener() {} } } as unknown as UniverseView;
  const rig = new CameraRig(view, () => state, () => {});
  return { state, camera, rig };
}

describe('camera following', () => {
  it('transfers following to the survivor of a merger', () => {
    const { state, camera, rig } = setup();
    rig.follow(7);
    state.positions.set(state.positions.subarray(0, 3), 21);
    mergeCloseBodies(state);
    rig.update(1 / 60);
    expect(rig.following).toBe(0);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
  });
});

it('rotates vertically through the poles and completes repeated full revolutions', () => {
  const { camera, rig } = setup();
  camera.lookAt(rig.controls.target);
  const initial = camera.position.clone(), initialUp = camera.up.clone();
  const radius = initial.distanceTo(rig.controls.target);
  const samples: Vector3[] = [];
  for (let i = 0; i < 144; i++) {
    rig.orbit(0, 10); rig.update(0);
    samples.push(camera.position.clone());
    expect(camera.position.distanceTo(rig.controls.target)).toBeCloseTo(radius, 11);
    expect(Math.abs(camera.up.dot(camera.position.clone().sub(rig.controls.target).normalize()))).toBeLessThan(0.5);
  }
  expect(samples[17].distanceTo(initial)).toBeGreaterThan(radius);
  expect(samples[35].clone().add(initial).length()).toBeLessThan(1e-10);
  expect(camera.position.distanceTo(initial)).toBeLessThan(1e-10);
  expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-10);
});
