import * as THREE from "three";

const vs = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fs = /* glsl */ `
  precision highp float;

  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uBaseGreen;     // main mask color
  uniform vec3  uShadowGreen;   // darker tint
  uniform float uGrainScale;
  uniform float uGrainStrength;

  uniform float uHovered;
  uniform float uSelected;

  // Hash / noise helpers (fast procedural grain)
  float hash21(vec2 p){
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
  }

  float fresnel(vec3 N, vec3 V, float power){
    return pow(1.0 - clamp(dot(N, V), 0.0, 1.0), power);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vPos);

    // simple lighting
    vec3 L = normalize(vec3(0.35, 0.9, 0.25));
    float ndl = clamp(dot(N, L), 0.0, 1.0);

    // procedural grain on board plane (x/z) so it looks like mask texture
    vec2 gp = vPos.xz * uGrainScale;
    float g = noise(gp + uTime * 0.05);
    float grain = (g - 0.5) * 2.0; // -1..1

    // subtle “mask” look: base + shadow tint + grain + fresnel sheen
    vec3 base = mix(uShadowGreen, uBaseGreen, 0.35 + 0.65 * ndl);
    base += grain * uGrainStrength;

    // thin glossy layer: fresnel highlight
    float f = fresnel(N, V, 5.0);
    base += vec3(0.12, 0.18, 0.12) * f;

    // interaction highlight (pulse)
    float pulse = 0.5 + 0.5 * sin(uTime * 6.0);
    vec3 hoverCol = vec3(0.35, 1.0, 0.55);  // brighter green
    vec3 selCol   = vec3(0.55, 1.0, 0.65);  // even brighter

    base = mix(base, hoverCol, uHovered * (0.25 + 0.25 * pulse));
    base = mix(base, selCol, uSelected * 0.45);

    gl_FragColor = vec4(base, 1.0);
  }
`;

export function createSolderMaskMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    uniforms: {
      uTime: { value: 0 },

      uBaseGreen: { value: new THREE.Color("#1f6a3a") },   // main mask tint
      uShadowGreen: { value: new THREE.Color("#0f3a22") }, // deeper shade

      uGrainScale: { value: 5.5 },
      uGrainStrength: { value: 0.06 },

      uHovered: { value: 0 },
      uSelected: { value: 0 },
    },
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    side: THREE.DoubleSide,
  });
}
