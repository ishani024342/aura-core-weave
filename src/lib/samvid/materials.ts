import * as THREE from "three";

export const PALETTE = {
  core: new THREE.Color("#7ff3ff"),
  deep: new THREE.Color("#2a6cff"),
  field: new THREE.Color("#59e6ff"),
  data: new THREE.Color("#8affd6"),
  chain: new THREE.Color("#a98bff"),
  org: new THREE.Color("#ffc98a"),
  alert: new THREE.Color("#ff7a8a"),
};

const vertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uBreath;
  void main() {
    vec3 p = position;
    p += normal * sin(p.y * 9.0 - uTime * 1.6) * 0.006 * uBreath;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    vPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uInner;
  uniform float uOpacity;
  uniform float uPulse;
  uniform float uScan;

  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.2);
    // fine internal geometry: a restrained grid living inside the volume
    float g = 0.0;
    g += smoothstep(0.96, 1.0, abs(sin(vPos.y * 62.0)));
    g += smoothstep(0.985, 1.0, abs(sin(atan(vPos.z, vPos.x) * 26.0)));
    g *= 0.28;
    // slow travelling scan
    float scan = smoothstep(0.0, 0.06, 0.06 - abs(fract(vPos.y * 0.22 - uTime * 0.11) - 0.5) * 0.6) * uScan;
    float energy = 0.10 + 0.06 * sin(uTime * 1.2 + vPos.y * 3.0);
    vec3 col = mix(uInner, uColor, clamp(fres + g, 0.0, 1.0));
    col += uColor * (scan * 0.8 + uPulse * 0.9);
    float alpha = uOpacity * (0.22 + fres * 1.15 + g + energy + scan * 0.5 + uPulse * 0.5);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export function hologramMaterial(opts?: {
  color?: THREE.Color;
  inner?: THREE.Color;
  opacity?: number;
  scan?: number;
  breath?: number;
}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: (opts?.color ?? PALETTE.core).clone() },
      uInner: { value: (opts?.inner ?? PALETTE.deep).clone() },
      uOpacity: { value: opts?.opacity ?? 1 },
      uPulse: { value: 0 },
      uScan: { value: opts?.scan ?? 1 },
      uBreath: { value: opts?.breath ?? 1 },
    },
  });
}
