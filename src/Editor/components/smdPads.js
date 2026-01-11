import * as THREE from "three";
import { createSolderMaskMaterial } from "../materials/solderMaskMaterial";
import RectPadBrushedCopperMaterial from "../materials/copperBrushMaterial";
import InstancedOutlinePads from "../outlines/instanceMeshOutlinePads";

export const SMD_PAD_SHAPES = {
  CIRCLE: "circle",
  RECTANGLE: "rectangle",
};

export default class SmdPads {

  constructor(
    shape,
    layer,
    scene,
    layerManager,
    {
      defaultPadSize = [0.1, 0.1],
      defaultRadius = 0.09,
      defaultThickness = 0.001,
      boundZ = 10,
      boundX = 10,
      name,
      padAttributes = [
        {
          size: [0.18, 0.12],
          position: [0, 0],
          name: "SMD_PAD_1",
        },
        {
          size: [0.18, 0.12],
          position: [0, 0],
          name: "SMD_PAD_2",
        },
      ],
    } = {}
  ) {
    this.boundZ = boundZ;
    this.boundX = boundX;
    this.shape = shape;
    this.scene = scene;
    this.layerManager = layerManager;
    this.layer = layer;
    this.defaultPadSize = defaultPadSize;
    this.defaultThickness = defaultThickness;
    this.defaultRadius = defaultRadius;
    this.padAttributes = padAttributes;
    this.count = padAttributes.length;
    this.layerManager = layerManager;
    this.layerPosY = this.layerManager.getLayerPosY(layer);

    const geo =
      shape === "circle"
        ? new THREE.CylinderGeometry(this.defaultRadius * 0.5, this.defaultRadius * 0.5, this.defaultThickness, 24)
        : new THREE.BoxGeometry(this.defaultPadSize[0] * 0.5, this.defaultThickness, this.defaultPadSize[0] * 0.5);

 
     this.matWrap = new RectPadBrushedCopperMaterial({
      shape: this.shape === "circle" ? "circle" : "rect",
      edgeWidth: 0.05,
      cornerRadius: 0.10,
      topFaceOnly: true,
    });

    this.mesh = new THREE.InstancedMesh(geo, this.matWrap.material, this.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.name = name ?? `SMD_PADS_${String(shape).toUpperCase()}`;
    this.mesh.frustumCulled = true;


    this.scene.add(this.mesh);

    this.layerManager.add(this.layer, this.mesh);

    this._dummy = new THREE.Object3D();

    // Per-instance id attribute (used by the shader for hover/select)
    const ids = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) ids[i] = i;

    this.mesh.geometry.setAttribute(
      "aInstanceId",
      new THREE.InstancedBufferAttribute(ids, 1)
    );

    this.applyPadAttributes(padAttributes); 

    this.mesh.geometry.computeVertexNormals();
  }

  applyPadAttributes(padAttributes = this.padAttributes) {
    this.padAttributes = padAttributes ?? [];
    
    const n = Math.min(this.count, this.padAttributes.length);
    for (let i = 0; i < n; i++) {
      const a = this.padAttributes[i] ?? {};

      const pos = a.position ?? [0, 0];

      if(Math.abs(pos[0]) > 1 || Math.abs(pos[1]) > 1) continue;

      const x = Array.isArray(pos) ? (pos[0] * this.boundX * 0.95 ?? 0) : (pos.x * this.boundX * 0.95 ?? 0);
      const z = Array.isArray(pos) ? (pos[1] * this.boundZ * 0.95 ?? 0) : (pos.z * this.boundZ * 0.95 ?? 0);

      const y = this.layerPosY;
    
      let sx = 1;
      let sz = 1;

      if (this.shape === "circle") {
        let r = typeof a.radius === "number" ? a.radius : this.defaultRadius;
        sx = r;
        sz = r;
      } else {
        const size = Array.isArray(a.size) ? a.size : this.defaultPadSize;
        sx = size[0] ?? this.defaultPadSize[0];
        sz = size[1] ?? this.defaultPadSize[1];
      }

      this._dummy.position.set(x, y, z );
      this._dummy.scale.set(sx, 1, sz);

      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this._dummy.matrix);

    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Build a serializable padAttributes array from the current instanced transforms.
   * This is what you want to export after dragging pads around.
   *
   * Notes:
   * - position is exported in the same normalized [-1..1] space you already use in json.
   * - rectangle pads export `size: [sx, sz]` (world units, matching how you currently scale).
   * - circle pads export `radius: r` (world units, from instance scale).
   */
  getPadAttributesSnapshot() {
    if (!this.mesh) return [];

    const out = [];
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    const denomX = (this.boundX * 0.95) || 1;
    const denomZ = (this.boundZ * 0.95) || 1;

    for (let i = 0; i < this.count; i++) {
      this.mesh.getMatrixAt(i, m);
      m.decompose(pos, quat, scl);

      const xNorm = pos.x / denomX;
      const zNorm = pos.z / denomZ;

      const name = this.padAttributes?.[i]?.name ?? `SMD_PAD_${i + 1}`;

      if (this.shape === "circle") {
        const r = (Math.abs(scl.x) + Math.abs(scl.z)) * 0.5;
        out.push({
          name,
          radius: r,
          position: [xNorm, zNorm],
        });
      } else {
        out.push({
          name,
          size: [scl.x, scl.z],
          position: [xNorm, zNorm],
        });
      }
    }

    return out;
  }

  /**
   * Build a full pads config object (shape/layer/name/etc) suitable for PrimitiveManager.exportJSON().
   */
  getConfigSnapshot() {
    const shapeStr = this.shape === "circle" ? "CIRCLE" : "RECTANGLE";
    const layerStr =
      this.layer === "bottom_copper" ? "BOTTOM_COPPER" :
      this.layer === "top_copper" ? "TOP_COPPER" :
      // fallback: keep whatever it is (already a string in your codebase)
      this.layer;

    return {
      shape: shapeStr,
      layer: layerStr,
      name: this.mesh?.name ?? `SMD_PADS_${shapeStr}`,
      defaultPadSize: this.defaultPadSize,
      defaultRadius: this.defaultRadius,
      defaultThickness: this.defaultThickness,
      padAttributes: this.getPadAttributesSnapshot(),
    };
  }

  addTo(parent) {
    parent.add(this.mesh);
  }

  dispose() {
    this.mesh?.geometry?.dispose?.();
    this.mesh?.material?.dispose?.();
    this.mesh?.parent?.remove(this.mesh);
    this.mesh = null;
    this._dummy = null;
  }
}
