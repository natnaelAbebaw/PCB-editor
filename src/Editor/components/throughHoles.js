import * as THREE from "three";

export default class ThroughHoles {

  constructor(scene, { positions, boundX, boundZ, boardThickness, yCenter = 0, wallColor = 0x111111 }) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "THROUGH_HOLES";

    for (let i = 0; i < positions.length; i++) {
      const { x, z, r } = positions[i];
      if(Math.abs(x) > 1 || Math.abs(z) > 1 || r <= 0) continue;
      if (!(r > 0)) continue;

      console.log(r);

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

    this.scene.add(this.group);
  }

  addTo(parent) {
    parent.add(this.group);
  }

  dispose() {
    // disposeObject3D(this.group);
    this.group = null;
  }
}
