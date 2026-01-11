import * as THREE from "three";
class PCBShape {
  constructor(width, depth, holes) {
    this.width = width;
    this.depth = depth;
    this.holes = holes;
  }
  
  _makePCBShape() {
    const w = this.width;
    const d = this.depth;

    const shape = new THREE.Shape();
    // Rectangle centered at origin, expressed in (x,z) => (x,y)
    shape.moveTo(-w * 0.5, -d * 0.5);
    shape.lineTo(w * 0.5, -d * 0.5);
    shape.lineTo(w * 0.5, d * 0.5);
    shape.lineTo(-w * 0.5, d * 0.5);
    shape.closePath();

    for (const h of this.holes) {
      if (!h) continue;
      if(Math.abs(h.x) > 1 || Math.abs(h.z) > 1 || h.r <= 0) continue;
      const x = h.x * w/2 * 0.98 ?? 0;
      const z = h.z * d/2 * 0.98 ?? 0;
      const r = h.r ?? 0;

      const holePath = new THREE.Path();
      holePath.absarc(x, z, r, 0, Math.PI * 2, false);
      shape.holes.push(holePath);
    }

    return shape;
  }

}

export default PCBShape;