import * as THREE from "three";
import { PCB_LAYERS } from "../LayerManager";

export default class ThroughHoles {

  constructor(scene, layerManager, { positions, boundX, boundZ, boardThickness, yCenter = 0, wallColor = 0x111111 } = {}) {
    this.scene = scene;
    this.layerManager = layerManager;
    this.group = new THREE.Group();
    this.group.name = "THROUGH_HOLES";

    for (let i = 0; i < (positions ?? []).length; i++) {
      const { x, z, r } = positions[i];
      if(Math.abs(x) > 1 || Math.abs(z) > 1 || r <= 0) continue;
      if (!(r > 0)) continue;

      const wallGeo = new THREE.CylinderGeometry(
        // Slightly smaller than the drilled radius to avoid z-fighting with the board cutout
        r ,
        r,
        boardThickness,
        24,
        1,
        true
      );

      const wallMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.name = `HOLE_WALL_${i}`;
      wall.position.set(x * boundX * 0.98, yCenter, -z * boundZ * 0.98);
      wall.renderOrder = 5;
      this.group.add(wall);
    }

    // Put through-holes under the board layer (so visibility toggles/layering stay consistent)
    if (this.layerManager?.add) {
      this.layerManager.add(PCB_LAYERS.BOARD, this.group);
    } else {
      this.scene.add(this.group);
    }
  }

  addTo(parent) {
    parent.add(this.group);
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
    });
    this.group.parent?.remove?.(this.group);
    this.group = null;
  }
}
