import * as THREE from "three";

import Sizes from "./Utils/Sizes.js";
import Time from "./Utils/Time.js";
import Camera from "./camera.js";
import Renderer from "./renderer.js";
import PrimitiveManager from "./components/PrimitiveManager.js";
import SelectionStore from "./interactions/selectionStore.js";
import TransformGizmo from "./interactions/TransformGizmo.js";
import InteractionManager from "./interactions/InteractionManager.js";
import pcbJson from "./pcb.json";


export default class Editor {
  constructor(canvas) {
    this.canvas = canvas;

    this.sizes =  new Sizes();
    this.scene = new THREE.Scene();
    this.time = new Time();
    this.camera = new Camera(this.canvas, this.sizes, this.scene);

    this.renderer = new Renderer(this.canvas, this.sizes, this.scene, this.camera);
    // Load initial scene from pcb.json
    this.primitiveManager = new PrimitiveManager({ scene: this.scene, initialConfig: pcbJson });

    this.selectionStore = new SelectionStore();

    this.transformGizmo = new TransformGizmo({
      camera: this.camera.instance,
      domElement: this.renderer.instance.domElement,
      controls: this.camera.controls,
      scene: this.scene,
    });

     this.interaction = new InteractionManager({
      camera: this.camera.instance,
      domElement: this.renderer.instance.domElement,
      scene: this.scene,
      pads: (this.primitiveManager.smdPads ?? []).map((p) => p?.mesh).filter(Boolean),
      padsMaterialApi: new Map(
        (this.primitiveManager.smdPads ?? [])
          .filter(Boolean)
          .map((p) => [p.mesh, p.matWrap])
      ),
      // PrimitiveManager.traces is now an array of Traces instances
      traces: (this.primitiveManager.traces ?? []).map((t) => t?.mesh).filter(Boolean),
      transformGizmo: this.transformGizmo,
      selectionStore: this.selectionStore,
      boardY: 0.0005,
    });

    // this.time.start();

        // Resize event
        this.sizes.on('resize', () =>
          {
              this.resize()
          })
  
          // Time tick event
          this.time.on('tick', () =>
          {
              this.update()
          })

  }

  loadFromJSON(json) {
    this.primitiveManager?.loadFromJSON?.(json);

    const pads = (this.primitiveManager?.smdPads ?? []).map((p) => p?.mesh).filter(Boolean);
    const padsMaterialApi = new Map(
      (this.primitiveManager?.smdPads ?? [])
        .filter(Boolean)
        .map((p) => [p.mesh, p.matWrap])
    );
    const traces = (this.primitiveManager?.traces ?? []).map((t) => t?.mesh).filter(Boolean);

    this.interaction?.setTargets?.({ pads, padsMaterialApi, traces });
  }


  resize()
  {
      this.camera.resize()
      this.renderer.resize()
  }

  update()
  {
      this.camera.update()

      // advance interaction + instanced pad dragging
      this.interaction?.update?.()

      // animate shader materials (pads/copper/etc.)
      // Time.elapsed is in ms; shaders expect seconds.
      const tSec = (this.time?.elapsed ?? 0) * 0.001
      ;(this.primitiveManager?.smdPads ?? []).forEach((p) => p?.matWrap?.updateTime?.(tSec))

      this.renderer.update()
  }

  destroy() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);

    window.removeEventListener("resize", this._onResize);

    this.camera?.controls?.dispose?.();
    this.interaction?.dispose?.();
    this.transformGizmo?.dispose?.();

    // dispose scene meshes/materials if you have any
    this.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.filter(Boolean).forEach((mat) => {
        for (const k in mat) {
          const v = mat[k];
          if (v && typeof v.dispose === "function") v.dispose();
        }
        mat.dispose?.();
      });
    });

    this.renderer?.destroy?.();
  }
}
