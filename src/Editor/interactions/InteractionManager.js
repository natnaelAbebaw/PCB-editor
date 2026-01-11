import * as THREE from "three";

export default class InteractionManager {
  constructor({
    camera,
    domElement,
    scene,
    pads,         // InstancedMesh | InstancedMesh[]
    padsMaterialApi, // Map<InstancedMesh, { setHoveredId(id), setSelectedId(id) }>
    traces,         
    transformGizmo,  
    selectionStore,  
    boardY = 0.0005, 
  }) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.pads = Array.isArray(pads) ? pads : pads ? [pads] : [];
    this.padsMaterialApi = padsMaterialApi instanceof Map ? padsMaterialApi : null;
    // Normalize to an array so hover/select works whether caller passes a single mesh or an array.
    this.traces = Array.isArray(traces) ? traces : traces ? [traces] : [];

    this.transformGizmo = transformGizmo;
    this.store = selectionStore;

    this.boardY = boardY;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._hover = { kind: null, id: -1, padMesh: null, trace: null };
    this._selected = { kind: null, padId: -1, padMesh: null, trace: null, proxy: null };

    // temp objects
    this._m = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scl = new THREE.Vector3();

    // proxy for moving one pad instance
    this._padProxy = new THREE.Object3D();
    this._padProxy.name = "PAD_PROXY";
    this.scene.add(this._padProxy);

    // events
    this._onMove = (e) => this.onPointerMove(e);
    this._onDown = (e) => this.onPointerDown(e);

    domElement.addEventListener("pointermove", this._onMove);
    domElement.addEventListener("pointerdown", this._onDown);
  }

  /**
   * Update raycast/interaction targets after the scene is rebuilt (e.g. loadFromJSON).
   */
  setTargets({ pads, padsMaterialApi, traces } = {}) {
    this.clearHover();
    this.clearSelection();
    this.store?.clear?.();

    this.pads = Array.isArray(pads) ? pads : pads ? [pads] : [];
    this.padsMaterialApi = padsMaterialApi instanceof Map ? padsMaterialApi : null;
    this.traces = Array.isArray(traces) ? traces : traces ? [traces] : [];
  }

  dispose() {
    this.domElement.removeEventListener("pointermove", this._onMove);
    this.domElement.removeEventListener("pointerdown", this._onDown);

    this.clearHover();
    this.clearSelection();

    this.scene.remove(this._padProxy);
  }

  _setPointerFromEvent(e) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  // ---------- Hover ----------
  _pickBest() {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = [];

    // pads first (instanced)
    if (this.pads?.length) {
      const ph = this.raycaster.intersectObjects(this.pads, false);
      if (ph.length) hits.push({ type: "pad", hit: ph[0] });
    }

    // traces (normal meshes)
    if (this.traces?.length) {
      const th = this.raycaster.intersectObjects(this.traces, false);
      if (th.length) hits.push({ type: "trace", hit: th[0] });
    }

    hits.sort((a, b) => a.hit.distance - b.hit.distance);
    return hits[0] ?? null;
  }

  onPointerMove(e) {
    // While dragging the gizmo, let TransformControls own pointer interactions.
    if (this.transformGizmo?.isDragging?.()) return;

    this._setPointerFromEvent(e);
    const best = this._pickBest();

    if (!best) {
      this.domElement.style.cursor = "default";
      this.clearHover();
      return;
    }

    this.domElement.style.cursor = "pointer";

    if (best.type === "pad") {
      const id = best.hit.instanceId;
      if (id == null) return;
      const padMesh = best.hit.object;
      if (this._hover.kind !== "pad" || this._hover.id !== id || this._hover.padMesh !== padMesh) {
        this.setHoverPad(padMesh, id);
      }
    } else {
      const trace = best.hit.object;
      if (this._hover.kind !== "trace" || this._hover.trace !== trace) {
        this.setHoverTrace(trace);
      }
    }
  }

  _getPadsApiFor(mesh) {
    return this.padsMaterialApi?.get?.(mesh) ?? null;
  }

  setHoverPad(padMesh, id) {
    this.clearHover();
    this._hover = { kind: "pad", id, padMesh, trace: null };
    this._getPadsApiFor(padMesh)?.setHoveredId?.(id);
    // Uncomment while debugging:
    // console.log("hover pad instanceId:", id);
  }

  setHoverTrace(traceMesh) {
    this.clearHover();
    this._hover = { kind: "trace", id: -1, trace: traceMesh };

    // Edge-only highlight: only show outline edges (do not change fill material)
    const oe = traceMesh?.userData?.outlineEdges;
    if (oe?.lines) {
      // Hover style
      oe.setColor?.(0xffff00);
    }
  }

  clearHover() {
    if (this._hover.kind === "pad") {
      this._getPadsApiFor(this._hover.padMesh)?.setHoveredId?.(-1);
    }
    if (this._hover.kind === "trace") {
      const oe = this._hover.trace?.userData?.outlineEdges;
      if (oe?.lines) {
        oe.setColor?.(0x099268);
      }
    }
    this._hover = { kind: null, id: -1, padMesh: null, trace: null };
  }

  onPointerDown(e) {
    // left click only
    if (e.button !== 0) return;

    // If clicking the gizmo handles, don't treat it as a selection click.
    // (TransformControls will handle the drag.)
    if (this.transformGizmo?.isHot?.()) return;

    // Pick on click (don't depend on hover state)
    this._setPointerFromEvent(e);
    const best = this._pickBest();

    if (!best) {
      this.clearSelection();
      this.store.clear();
      return;
    }

    if (best.type === "pad") {
      const id = best.hit.instanceId;
      if (id == null) return;
      this.selectPad(best.hit.object, id);
      return;
    }

    // clicking anything else clears selection for now
    this.clearSelection();
    this.store.clear();
  }

  selectPad(padMesh, instanceId) {
    this.clearSelection();

    console.log(instanceId);

    // mark selected in shader
    this._getPadsApiFor(padMesh)?.setSelectedId?.(instanceId);

    // build proxy transform from instance matrix
    padMesh.getMatrixAt(instanceId, this._m);
    this._m.decompose(this._pos, this._quat, this._scl);

    this._padProxy.position.copy(this._pos);
    this._padProxy.quaternion.copy(this._quat);
    this._padProxy.scale.copy(this._scl);
    this._padProxy.updateMatrix();

    this._selected = { kind: "pad", padId: instanceId, padMesh, trace: null, proxy: this._padProxy };

    // attach transform controls, lock Y
    this.transformGizmo.attach(this._padProxy, this._pos.y);

    // update sidebar data now + during drag (we’ll update in update())
    this._updateSelectedPadSidebar();
  }

  clearSelection() {
    if (this._selected.kind === "pad") {
      this._getPadsApiFor(this._selected.padMesh)?.setSelectedId?.(-1);
    }

    this.transformGizmo.detach();

    this._selected = { kind: null, padId: -1, padMesh: null, trace: null, proxy: null };
  }

  // Called each frame from your Editor.update()
  update() {
    if (this._selected.kind === "pad") {
      // copy proxy transform back into instanced matrix
      const i = this._selected.padId;
      this._padProxy.updateMatrix();
      const m = this._selected.padMesh;
      if (m) {
        m.setMatrixAt(i, this._padProxy.matrix);
        m.instanceMatrix.needsUpdate = true;
      }

      this._updateSelectedPadSidebar();
    }
  }

  _updateSelectedPadSidebar() {
    const wp = new THREE.Vector3();
    this._padProxy.getWorldPosition(wp);

    // pad area in world units (for PlaneGeometry 1x1 scaled by (sx,sz))
    const area = this._padProxy.scale.x * this._padProxy.scale.z;

    this.store.set({
      kind: "pad",
      object: this._padProxy,
      padInstanceId: this._selected.padId,
      worldPos: { x: wp.x, y: wp.y, z: wp.z },
      area,
    });
  }


}
