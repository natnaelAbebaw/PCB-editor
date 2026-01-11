import * as THREE from "three";

export default class InstancedOutlinePads {
  constructor(sourceInstancedMesh, { scale = 1.08, color = 0x2b1405 } = {}) {
    this.source = sourceInstancedMesh;

    const mat = new THREE.MeshBasicMaterial({ color });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
    this.mesh = new THREE.InstancedMesh(sourceInstancedMesh.geometry, mat, sourceInstancedMesh.count);
    this.mesh.name = `${sourceInstancedMesh.name}_OUTLINE`;

    // copy matrices, apply extra scale per instance
    const dummy = new THREE.Object3D();
    const m = new THREE.Matrix4();

    for (let i = 0; i < this.mesh.count; i++) {
      sourceInstancedMesh.getMatrixAt(i, m);
      dummy.matrix.copy(m);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      dummy.scale.multiplyScalar(scale);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.renderOrder = (sourceInstancedMesh.renderOrder ?? 0) - 1; // draw behind
  }

  addTo(parent) {
    parent.add(this.mesh);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
