import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

export default class TransformGizmo {
  constructor({ camera, domElement, controls, scene }) {
    this.controls = controls;
    this.scene = scene;
    this.tc = new TransformControls(camera, domElement);
    this.tc.setMode("translate");
    this.tc.showY = false; // hide Y axis handle

    this.helper = this.tc.getHelper();
    this.scene?.add(this.helper);

    this.dragging = false;
    this.tc.addEventListener("dragging-changed", (e) => {
      this.dragging = !!e.value;
      if (this.controls) this.controls.enabled = !e.value;
    });

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


  isDragging() {
    return !!this.dragging;
  }


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
