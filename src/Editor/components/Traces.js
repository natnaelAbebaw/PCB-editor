
import * as THREE from "three";
import { createSolderMaskMaterial } from "../materials/solderMaskMaterial";
import OutlineEdges from "../outlines/outlineEdges";

export default class Traces {

  constructor(
    scene,
    {
    points,
    width = 0.06,
    y,
    miterLimit = 4,
    material,
    name = "TRACE",
  }) {
    if (!points || points.length < 2) {
      throw new Error("Trace requires at least 2 points.");
    }
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Trace width must be > 0. Got: ${width}`);
    }
    if (!Number.isFinite(y)) {
      throw new Error(`Trace y must be finite. Got: ${y}`);
    }

    this.points = points;
    this.width = width;
    this.y = y;
    this.miterLimit = miterLimit;
    this.scene = scene;

    const geo = this._buildRibbonGeometry(points, width, y, miterLimit);

    const mat = createSolderMaskMaterial();

    // const baseOutline = { color: 0x099268, opacity: 0.65 };

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = name;
    this.mesh.frustumCulled = true;
    this.scene.add(this.mesh);

    // Outline always exists; InteractionManager will override + restore style on hover.
    const outline = new OutlineEdges(this.mesh);
    this.mesh.userData.outlineEdges = outline;
  }

  addTo(parent) {
    parent.add(this.mesh);
  }

  dispose() {
    if (!this.mesh) return;
    this.mesh.geometry?.dispose?.();
    this.mesh.material?.dispose?.();
    this.mesh.parent?.remove(this.mesh);
    this.mesh = null;
  }

  _buildRibbonGeometry(points, width, y, miterLimit) {
    const up = new THREE.Vector3(0, 1, 0);
    const halfW = width * 0.5;

    // 1) flatten onto surface Y and remove near-duplicate consecutive points
    const p = this._sanitizePoints(points, y);
    const n = p.length;
    if (n < 2) throw new Error("Trace points collapse to < 2 unique points.");

    const positions = [];
    const uvs = [];
    const indices = [];

    // For UV V coordinate (distance along path)
    const dist = new Array(n).fill(0);
    for (let i = 1; i < n; i++) dist[i] = dist[i - 1] + p[i].distanceTo(p[i - 1]);
    const totalLen = dist[n - 1] || 1;

    // Pre-allocated temps (avoid GC)
    const dirA = new THREE.Vector3();
    const dirB = new THREE.Vector3();
    const nA = new THREE.Vector3();
    const nB = new THREE.Vector3();
    const miter = new THREE.Vector3();
    const offset = new THREE.Vector3();

    // 2) compute left/right vertices per point
    for (let i = 0; i < n; i++) {
      const prev = p[i === 0 ? 0 : i - 1];
      const curr = p[i];
      const next = p[i === n - 1 ? n - 1 : i + 1];

      // Segment directions
      dirA.subVectors(curr, prev);
      dirB.subVectors(next, curr);

      // Handle ends: if first or last, just use the available segment direction
      const isStart = i === 0;
      const isEnd = i === n - 1;

      if (isStart) {
        // direction = next - curr
        if (!this._safeNormalize(dirB, new THREE.Vector3(1, 0, 0))) {
          dirB.set(1, 0, 0);
        }
        nB.crossVectors(up, dirB);
        this._safeNormalize(nB, new THREE.Vector3(0, 0, 1));
        offset.copy(nB).multiplyScalar(halfW);

        this._pushPair(positions, uvs, curr, offset, dist[i] / totalLen);
        continue;
      }

      if (isEnd) {
        // direction = curr - prev
        if (!this._safeNormalize(dirA, new THREE.Vector3(1, 0, 0))) {
          dirA.set(1, 0, 0);
        }
        nA.crossVectors(up, dirA);
        this._safeNormalize(nA, new THREE.Vector3(0, 0, 1));
        offset.copy(nA).multiplyScalar(halfW);

        this._pushPair(positions, uvs, curr, offset, dist[i] / totalLen);
        continue;
      }

      // Normalize segment dirs
      const okA = this._safeNormalize(dirA, null);
      const okB = this._safeNormalize(dirB, null);
      if (!okA || !okB) {
        // Degenerate corner (very short segments) -> fallback to previous normal
        // Use whichever direction is valid
        const fallbackDir = okB ? dirB : okA ? dirA : new THREE.Vector3(1, 0, 0);
        nB.crossVectors(up, fallbackDir);
        this._safeNormalize(nB, new THREE.Vector3(0, 0, 1));
        offset.copy(nB).multiplyScalar(halfW);

        this._pushPair(positions, uvs, curr, offset, dist[i] / totalLen);
        continue;
      }

      // Segment normals (perpendicular on board plane)
      nA.crossVectors(up, dirA);
      nB.crossVectors(up, dirB);
      this._safeNormalize(nA, new THREE.Vector3(0, 0, 1));
      this._safeNormalize(nB, new THREE.Vector3(0, 0, 1));

      // Miter direction = normalize(nA + nB)
      miter.addVectors(nA, nB);
      const okM = this._safeNormalize(miter, null);

      if (!okM) {
        // 180° turn or collinear opposite -> bevel by using one normal
        offset.copy(nB).multiplyScalar(halfW);
        this._pushPair(positions, uvs, curr, offset, dist[i] / totalLen);
        continue;
      }

      // Miter length correction
      // scale = halfW / dot(miter, nB)  (same as halfW / sin(theta/2) behavior)
      const denom = miter.dot(nB);
      let miterLen = halfW;
      if (Math.abs(denom) > 1e-6) miterLen = halfW / denom;

      // Miter limit (avoid spikes on sharp corners)
      const maxLen = halfW * miterLimit;
      if (!Number.isFinite(miterLen) || Math.abs(miterLen) > maxLen) {
        // Bevel join fallback: use nB (or nA) without over-extending
        offset.copy(nB).multiplyScalar(halfW);
      } else {
        offset.copy(miter).multiplyScalar(miterLen);
      }

      this._pushPair(positions, uvs, curr, offset, dist[i] / totalLen);
    }

    // 3) build indices (2 triangles per segment)
    for (let i = 0; i < n - 1; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = (i + 1) * 2;
      const i3 = (i + 1) * 2 + 1;

      indices.push(i0, i2, i1);
      indices.push(i2, i3, i1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals(); // mostly flat; good for lighting
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }

  // Push (left,right) vertices and UVs for one center point.
  _pushPair(positions, uvs, curr, offset, v) {
    // left = curr - offset, right = curr + offset
    positions.push(curr.x - offset.x, curr.y - offset.y, curr.z - offset.z);
    positions.push(curr.x + offset.x, curr.y + offset.y, curr.z + offset.z);

    // UVs: u=0 left, u=1 right, v along length
    uvs.push(0, v);
    uvs.push(1, v);
  }

  _sanitizePoints(points, y) {
    const out = [];
    const EPS2 = 1e-12;

    for (let i = 0; i < points.length; i++) {
      const v = points[i];
      const x = Number(v.x);
      const z = Number(v.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;

      const p = new THREE.Vector3(x, y, z);

      if (out.length === 0) {
        out.push(p);
      } else {
        const last = out[out.length - 1];
        if (p.distanceToSquared(last) > EPS2) out.push(p);
      }
    }

    return out;
  }

  _safeNormalize(v, fallbackVec3OrNull) {
    const lenSq = v.lengthSq();
    if (lenSq < 1e-12 || !Number.isFinite(lenSq)) {
      if (fallbackVec3OrNull) v.copy(fallbackVec3OrNull);
      return false;
    }
    v.multiplyScalar(1 / Math.sqrt(lenSq));
    return true;
  }
}
