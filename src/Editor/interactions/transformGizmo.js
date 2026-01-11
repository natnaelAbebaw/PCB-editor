import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

export default class TransformGizmo {
  constructor({ camera, domElement, controls, scene }) {
    this.controls = controls;
    this.scene = scene;
    this.tc = new TransformControls(camera, domElement);
    this.tc.setMode("translate");
    this.tc.showY = false; // hide Y axis handle

    // In three@0.182, TransformControls is NOT an Object3D; add its helper to the scene.
    this.helper = this.tc.getHelper();
    this.scene?.add(this.helper);

    this.dragging = false;
    this.tc.addEventListener("dragging-changed", (e) => {
      // disable orbit while dragging
      this.dragging = !!e.value;
      if (this.controls) this.controls.enabled = !e.value;
    });

    // hard lock to XZ plane (force Y to remain constant)
    this._lockedY = 0;
    this.tc.addEventListener("objectChange", () => {
      const obj = this.tc.object;
      if (!obj) return;
      obj.position.y = this._lockedY;
    });
  }

  attach(object, lockY) {
    this._lockedY = lockY;
    this.tc.attach(object);
  }

  detach() {
    this.tc.detach();
  }

  /**
   * True while the user is actively dragging a gizmo handle.
   * Useful for suppressing other pointer interactions while dragging.
   */
  isDragging() {
    return !!this.dragging;
  }

  /**
   * True when a gizmo axis is "hot" (pointer is over a handle).
   * Useful to avoid selecting board objects when the user clicks the gizmo.
   */
  isHot() {
    return this.tc?.axis != null;
  }

  dispose() {
    // remove helper (Object3D) from scene
    this.helper?.parent?.remove?.(this.helper);
    this.helper = null;
    this.tc.dispose();
    this.tc = null;
  }
}
