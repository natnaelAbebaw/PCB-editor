import * as THREE from "three";

export default class OutlineEdges {
  constructor(
    mesh,
    {
      thresholdAngle = 20,
      color = 0x099268,
      opacity = 1.0,
      depthBias = 1e-4, 
    } = {}
  ) {
    const geo = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);

    const mat = new THREE.ShaderMaterial({
      transparent: opacity < 1,
      depthTest: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uDepthBias: { value: depthBias },
      },
      vertexShader: /* glsl */ `
        uniform float uDepthBias;
        void main() {
          // Standard line transform
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vec4 clipPos = projectionMatrix * mvPos;
          // Push slightly toward camera in clip space:
          // subtracting z makes it "closer" in depth.
          clipPos.z -= uDepthBias * clipPos.w;

          gl_Position = clipPos;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity);
        }
      `,
    });

    mat.depthFunc = THREE.LessEqualDepth;

    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.name = `${mesh.name}_EDGES`;

    mesh.add(this.lines);

    this.lines.renderOrder = (mesh.renderOrder ?? 0) + 1;
  }

  addTo(_) {
    // already parented to mesh
  }

  setColor(hex) {
    this.lines.material.uniforms.uColor.value.set(hex);
  }

  setOpacity(a) {
    this.lines.material.uniforms.uOpacity.value = a;
    this.lines.material.transparent = a < 1;
  }

  setDepthBias(bias) {
    this.lines.material.uniforms.uDepthBias.value = bias;
  }

  dispose() {
    this.lines.geometry.dispose();
    this.lines.material.dispose();
    this.lines.parent?.remove(this.lines);
  }
}
