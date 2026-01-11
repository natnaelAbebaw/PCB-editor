import * as THREE from "three";
import { PCB_LAYERS } from "../LayerManager.js";
import PCBShape from "./PCBShape";

export default class CopperLayer extends PCBShape {
   zEps = 0.0008;
  constructor(scene, layerManager, copperType, { height = 0.018, width = 6, depth = 4, holes = [],name = "COPPER_LAYER" } = {}) {
    super(width, depth, holes);
    this.scene = scene;
    this.layerManager = layerManager;
    this.copperType = copperType;
    this.height = height;
    this.holes = holes;
    this.name = name;

    this.createCopper();
  }

  _makeCopperGeometry() {
    const shape = this._makePCBShape();
    const geo = new THREE.ShapeGeometry(shape, 48);
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  createCopper() {
    // ---- Copper layers (thin planes)
    // Use both: discrete Z spacing + polygonOffset to kill z-fighting
    const yoff = this.copperType === PCB_LAYERS.TOP_COPPER ? this.height * 0.5 + this.zEps : -this.height * 0.5 - this.zEps;

    // Copper should also have the same holes cut out, otherwise it "covers" the drilled voids.
    const copperGeo = this._makeCopperGeometry();

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0x087f5b,
      roughness: 0.35,
      metalness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    });


    this.mesh = new THREE.Mesh(copperGeo, copperMat);
    this.mesh.name = this.name;
    this.mesh.position.y = yoff;
    this.mesh.receiveShadow = false;
    this.layerManager.setLayerPosY(this.copperType, yoff);
    this.layerManager.add(this.copperType, this.mesh);
    this.scene.add(this.mesh);
  }


  dispose() {
    // only dispose what we own; LayerManager owns scene graph placement
    this.mesh?.geometry?.dispose?.();
    this.mesh?.material?.dispose?.();
    this.mesh?.parent?.remove?.(this.mesh);
    this.mesh = null;
  }
}