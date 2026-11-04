import { Vector3 } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SimulationState } from './physics';
import type { UniverseView } from './universe';

export class CameraRig {
  readonly controls: OrbitControls;
  cinematic = true;
  following: number | null = null;
  private transitioning = false;
  private lastTarget = new Vector3();
  private target = new Vector3();
  private pointer: { x: number; y: number; pan: boolean } | null = null;
  private dragged = false;

  constructor(private view: UniverseView, private getState: () => SimulationState, private onChange: () => void) {
    this.controls = new OrbitControls(view.camera, view.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.autoRotateSpeed = 0.24;
    this.controls.zoomSpeed = 0.7;
    view.canvas.addEventListener('pointerdown', event => {
      const pan = event.button === 2 || event.shiftKey || event.ctrlKey || event.metaKey;
      this.pointer = { x: event.clientX, y: event.clientY, pan };
      this.dragged = false;
    });
    view.canvas.addEventListener('pointermove', event => {
      if (!this.pointer) return;
      if (Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 4) {
        this.dragged = true;
        if (this.pointer.pan && this.following !== null) { this.following = null; this.onChange(); }
      }
    });
    view.canvas.addEventListener('pointerup', event => {
      if (this.pointer && !this.dragged && event.button === 0 && !this.pointer.pan) {
        const picked = view.pick(event.clientX, event.clientY, this.getState());
        if (picked !== null) this.follow(picked);
      }
      this.pointer = null;
    });
    view.canvas.addEventListener('pointercancel', () => { this.pointer = null; });
    view.canvas.addEventListener('contextmenu', event => event.preventDefault());
    this.controls.addEventListener('start', () => {
      this.cinematic = false;
      this.controls.autoRotate = false;
      this.onChange();
    });
    this.reset();
  }

  reset(): void {
    const state = this.getState(), r = state.settings.radius;
    this.following = null; this.cinematic = true; this.transitioning = false;
    // Flush damping from the previous scene before restoring the exact pose.
    this.controls.enableDamping = false;
    this.controls.autoRotate = false;
    this.controls.update();
    this.controls.target.fromArray(state.positions, 0);
    this.view.camera.position.copy(this.controls.target).add(new Vector3(2.5, 1.9, 3.8).multiplyScalar(r));
    this.controls.minDistance = r * 0.1;
    this.controls.maxDistance = r * 30;
    this.view.camera.near = r * 0.005;
    this.view.camera.far = Math.max(180, r * 100);
    this.view.camera.updateProjectionMatrix();
    this.controls.update();
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.lastTarget.copy(this.controls.target);
    this.onChange();
  }

  follow(index: number): void {
    this.cinematic = false; this.controls.autoRotate = false;
    this.following = index;
    this.transitioning = true;
    // Start follow without snapping the view across space.
    this.lastTarget.fromArray(this.getState().positions, index * 3);
    this.onChange();
  }

  returnToScene(): void { this.reset(); }
  resumeCinematic(): void { this.reset(); }

  update(seconds: number): void {
    const state = this.getState();
    const index = this.following ?? (this.cinematic ? 0 : null);
    if (index !== null) {
      this.target.fromArray(state.positions, index * 3);
      if (this.following !== null) {
        const delta = this.target.clone().sub(this.controls.target);
        if (this.transitioning) {
          if (delta.length() < state.settings.radius * 0.0001) this.transitioning = false;
          else delta.multiplyScalar(1 - Math.exp(-seconds * 7));
        }
        this.controls.target.add(delta);
        this.view.camera.position.add(delta);
      } else {
        const delta = this.target.clone().sub(this.controls.target);
        this.controls.target.add(delta);
        this.view.camera.position.add(delta);
      }
      this.lastTarget.copy(this.target);
    }
    this.controls.autoRotate = this.cinematic;
    this.controls.update(seconds);
  }
}
