import * as THREE from "three";

export default class RectPadBrushedCopperMaterial {
  constructor({
    // pad shape for the edge mask (UV-space SDF)
    // "rect"  -> rounded-rectangle (default)
    // "circle"-> circle (for circular pads)
    shape = "rect",
    circleRadiusUv = 0.5,

    fillDark = "#7a3d0c",
    fillMid = "#c97b1c",
    fillBright = "#ffcc7a",
    edgeColor = "#2b1405",

    // outline controls in UV space
    edgeWidth = 0.045,     // 0.03..0.08
    cornerRadius = 0.10,   // 0..0.25

    // brush controls
    brushScale = 18.0,
    brushStrength = 0.85,
    noiseScale = 7.0,
    specStrength = 0.55,
    anisoStrength = 0.85,

    // if you only want the top face visible (recommended for pads),
    // set to true and it will discard fragments that aren't facing up.
    topFaceOnly = true,
  } = {}) {
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      uniforms: {
        uFillDark: { value: new THREE.Color(fillDark) },
        uFillMid: { value: new THREE.Color(fillMid) },
        uFillBright: { value: new THREE.Color(fillBright) },
        uEdge: { value: new THREE.Color(edgeColor) },

        uEdgeWidth: { value: edgeWidth },
        uCornerRadius: { value: cornerRadius },
        uShape: { value: shape === "circle" ? 1.0 : 0.0 }, // 0=rect, 1=circle
        uCircleRadiusUv: { value: circleRadiusUv },

        uBrushScale: { value: brushScale },
        uBrushStrength: { value: brushStrength },
        uNoiseScale: { value: noiseScale },
        uSpecStrength: { value: specStrength },
        uAnisoStrength: { value: anisoStrength },

        uTime: { value: 0 },

        // per-instance interaction
        uHoveredId: { value: -1 },
        uSelectedId: { value: -1 },

        uTopFaceOnly: { value: topFaceOnly ? 1.0 : 0.0 },

      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

        #ifdef USE_INSTANCING
          attribute float aInstanceId;
          varying float vInstanceId;
        #endif

        void main() {
          vUv = uv;

          vec4 wp = modelMatrix * vec4(position, 1.0);

          #ifdef USE_INSTANCING
            wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vInstanceId = aInstanceId;
          #endif

          vWorldPos = wp.xyz;

          // good enough for thin copper; if you need exact instanced normals later,
          // compute from instanceMatrix too (more expensive).
          vWorldNormal = normalize(mat3(modelMatrix) * normal);

          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

        #ifdef USE_INSTANCING
          varying float vInstanceId;
        #endif

        uniform vec3 uFillDark;
        uniform vec3 uFillMid;
        uniform vec3 uFillBright;
        uniform vec3 uEdge;

        uniform float uEdgeWidth;
        uniform float uCornerRadius;
        uniform float uShape;
        uniform float uCircleRadiusUv;

        uniform float uBrushScale;
        uniform float uBrushStrength;
        uniform float uNoiseScale;
        uniform float uSpecStrength;
        uniform float uAnisoStrength;

        uniform float uTime;

        uniform float uHoveredId;
        uniform float uSelectedId;

        uniform float uTopFaceOnly;

        // ---- small noise
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
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
        }

        // ---- rounded rectangle SDF in UV centered space
        float sdRoundRect(vec2 p, vec2 halfSize, float r) {
          // p in [-0.5..0.5]
          vec2 q = abs(p) - (halfSize - vec2(r));
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        float sdCircle(vec2 p, float r) {
          return length(p) - r;
        }

        // ---- brushed pattern on board plane (world XZ)
        float brushed(vec2 xz){
          // streaks along X with per-Z jitter
          float cell = floor(xz.y);
          float j = hash21(vec2(cell, cell + 11.0)) * 2.0 - 1.0;
          float s = fract(xz.x + j * 0.35);
          float line = smoothstep(0.10, 0.50, s) - smoothstep(0.50, 0.90, s);
          return line;
        }

        void main() {
          vec3 N = normalize(vWorldNormal);

          // Optional: keep only top-facing fragments (prevents box sides from showing)
          if (uTopFaceOnly > 0.5) {
            // if normal points away from +Y, discard
            if (dot(N, vec3(0.0, 1.0, 0.0)) < 0.2) discard;
          }

          // --- Outline mask (UV space)
          vec2 p = vUv - 0.5;                 // [-0.5..0.5]
          vec2 halfSize = vec2(0.5, 0.5);
          float d = sdRoundRect(p, halfSize, uCornerRadius);
          if (uShape > 0.5) {
            d = sdCircle(p, uCircleRadiusUv);
          }

          float aa = fwidth(d) * 1.5;
          float inside = 1.0 - smoothstep(0.0, aa, d);
          float edge = 1.0 - smoothstep(uEdgeWidth, uEdgeWidth + aa, abs(d));

          // --- Lighting + brushed copper
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(vec3(0.4, 0.9, 0.2));
          float ndl = clamp(dot(N, L), 0.0, 1.0);

          // base copper tone with lambert-ish shading
          vec3 base = mix(uFillDark, uFillMid, 0.25 + 0.75 * ndl);

          // brushed streaks and micro noise
          float b = brushed(vWorldPos.xz * uBrushScale);
          float n = noise(vWorldPos.xz * uNoiseScale + uTime * 0.02);
          n = (n - 0.5) * 2.0;

          base = mix(base, uFillBright, b * uBrushStrength * 0.35);
          base *= (1.0 + n * 0.06);

          // spec-ish highlight with anisotropic feel along world +X
          vec3 H = normalize(L + V);
          float ndh = clamp(dot(N, H), 0.0, 1.0);

          vec3 T = normalize(vec3(1.0, 0.0, 0.0)); // brush direction
          float tdH = abs(dot(T, H));
          float aniso = mix(1.0, tdH, uAnisoStrength);

          float spec = pow(ndh, 48.0) * uSpecStrength * aniso;
          vec3 col = base + spec * uFillBright;

          // apply outline color
          col = mix(col, uEdge, edge);

          // --- Hover / Selected per instance
          float hovered = 0.0;
          float selected = 0.0;

          #ifdef USE_INSTANCING
            // Treat ids as "equal" if within 0.1 (robust if anything gets float-rounded)
            hovered  = step(0.0, uHoveredId)  * (1.0 - step(0.1, abs(vInstanceId - uHoveredId)));
            selected = step(0.0, uSelectedId) * (1.0 - step(0.1, abs(vInstanceId - uSelectedId)));
          #endif

          float pulse = 0.5 + 0.5 * sin(uTime * 7.0);
          // col = mix(col, vec3(1.0, 0.90, 0.35), hovered * (0.25 + 0.25 * pulse));
          vec3 edgeHover = vec3(1.0, 0.95, 0.25);

          // Strong edge-only highlight (with pulse)
          col = mix(col, edgeHover, hovered * edge * (0.55 + 0.35 * pulse)); 
          col = mix(col, vec3(1.0, 0.70, 0.20), selected * edge * 0.95);

          // alpha mask (only draw inside rounded rect)
          gl_FragColor = vec4(col, inside);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
    });


    this.material.defines = this.material.defines ?? {};
    this.material.defines.USE_INSTANCING = "";
    this.material.needsUpdate = true;

    // z-fighting helper vs board
    this.material.polygonOffset = true;
    this.material.polygonOffsetFactor = -5;
    this.material.polygonOffsetUnits = -5;
  }

  updateTime(t) {
    this.material.uniforms.uTime.value = t;
  }

  setHoveredId(id) {
    this.material.uniforms.uHoveredId.value = id ?? -1;
  }

  setDebugInstanceId(enabled) {
    this.material.uniforms.uDebugInstanceId.value = enabled ? 1.0 : 0.0;
  }

  setSelectedId(id) {
    this.material.uniforms.uSelectedId.value = id ?? -1;
  }

  dispose() {
    this.material.dispose();
  }
}
