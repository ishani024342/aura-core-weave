import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { headGeometry, taperedTube, torsoGeometry } from "@/lib/samvid/geometry";
import { hologramMaterial, PALETTE } from "@/lib/samvid/materials";
import type { Sys } from "@/lib/samvid/state";

function useBodyGeometries() {
  return useMemo(() => {
    const torso = torsoGeometry();
    const head = headGeometry();
    const torsoW = torsoGeometry(14);
    const headW = headGeometry(10);
    const neck = taperedTube(
      [
        [0, 1.1, 0],
        [0, 1.2, 0.005],
        [0, 1.3, 0.01],
      ],
      [0.09, 0.062, 0.058],
      16,
      16,
    );
    const arm = (s: number, seg = 40, rad = 18) =>
      taperedTube(
        [
          [s * 0.2, 1.06, 0],
          [s * 0.3, 0.82, 0.02],
          [s * 0.335, 0.55, 0.07],
          [s * 0.31, 0.28, 0.11],
          [s * 0.29, 0.14, 0.11],
        ],
        [0.085, 0.062, 0.05, 0.042, 0.028],
        seg,
        rad,
      );
    const leg = (s: number, seg = 40, rad = 18) =>
      taperedTube(
        [
          [s * 0.1, 0.02, 0],
          [s * 0.125, -0.3, 0.02],
          [s * 0.12, -0.62, 0.0],
          [s * 0.11, -0.92, 0.02],
          [s * 0.11, -1.06, 0.05],
        ],
        [0.135, 0.1, 0.075, 0.05, 0.035],
        seg,
        rad,
      );
    const neckW = taperedTube(
      [
        [0, 1.1, 0],
        [0, 1.2, 0.005],
        [0, 1.3, 0.01],
      ],
      [0.09, 0.062, 0.058],
      4,
      7,
    );
    return {
      parts: [torso, head, neck, arm(1), arm(-1), leg(1), leg(-1)],
      wireSources: [torsoW, headW, neckW, arm(1, 8, 8), arm(-1, 8, 8), leg(1, 8, 8), leg(-1, 8, 8)],
    };
  }, []);
}

export function DigitalHuman({
  sys,
  onActivate,
}: {
  sys: React.MutableRefObject<Sys>;
  onActivate: () => void;
}) {
  const group = useRef<THREE.Group>(null!);
  const { parts, wireSources } = useBodyGeometries();

  // Smooth, glossy, volumetric skin — pearlescent porcelain lit by the field.
  const surface = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#dfe9ff"),
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        iridescence: 0.6,
        iridescenceIOR: 1.4,
        sheen: 1,
        sheenColor: new THREE.Color(PALETTE.core),
        sheenRoughness: 0.5,
        emissive: new THREE.Color(PALETTE.deep),
        emissiveIntensity: 0.28,
        transmission: 0.12,
        thickness: 0.6,
      }),
    [],
  );
  const innerCore = useMemo(
    () =>
      hologramMaterial({
        color: PALETTE.field,
        inner: PALETTE.deep,
        opacity: 0.5,
        scan: 0.2,
        breath: 2.4,
      }),
    [],
  );

  const bodies = useMemo(() => parts.map((g) => ({ geo: g })), [parts]);

  const heartGeo = useMemo(() => new THREE.IcosahedronGeometry(0.085, 1), []);
  const heart = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const t = sys.current.time;
    const p = sys.current.phase;
    innerCore.uniforms['uTime']!.value = t;
    innerCore.uniforms['uPulse']!.value = sys.current.pulse;
    surface.emissiveIntensity = 0.24 + sys.current.pulse * 0.7 + p * 0.12;

    if (group.current) {
      group.current.position.y = -0.2 + Math.sin(t * 0.55) * 0.045;
      group.current.rotation.y = Math.sin(t * 0.18) * 0.22;
      group.current.rotation.z = Math.sin(t * 0.31) * 0.012;
      const s = 0.78 + p * 0.16 + sys.current.pulse * 0.04;
      group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, s, 6, dt));
    }
    if (heart.current) {
      heart.current.rotation.y += dt * 0.8;
      heart.current.rotation.x += dt * 0.3;
      const hs = 1 + Math.sin(t * 2.1) * 0.12 + sys.current.pulse * 1.6;
      heart.current.scale.setScalar(hs);
    }
  });

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      {/* studio-style rig travelling with the figure for the glossy render look */}
      <pointLight position={[1.6, 2.2, 2.4]} intensity={9} color="#ffffff" distance={14} />
      <pointLight position={[-2.0, 0.6, 1.2]} intensity={6} color={PALETTE.core} distance={14} />
      <pointLight position={[0, 0.4, -2.6]} intensity={7} color={PALETTE.field} distance={14} />
      {bodies.map((b, i) => (
        <mesh key={i} geometry={b.geo} material={surface} castShadow={false} />
      ))}
      {/* joint caps so limbs read as one continuous cast form */}
      <mesh position={[0, 0.06, 0.01]} material={surface} scale={[1.35, 0.85, 1]}>
        <sphereGeometry args={[0.16, 32, 24]} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.2, 1.06, 0]} material={surface}>
            <sphereGeometry args={[0.088, 28, 20]} />
          </mesh>
          <mesh position={[s * 0.29, 0.13, 0.11]} material={surface} scale={[1, 1.25, 0.7]}>
            <sphereGeometry args={[0.032, 20, 16]} />
          </mesh>
          <mesh position={[s * 0.11, 0.02, 0.005]} material={surface}>
            <sphereGeometry args={[0.13, 28, 20]} />
          </mesh>
          <mesh position={[s * 0.11, -1.08, 0.055]} material={surface} scale={[1.15, 0.62, 2.6]}>
            <sphereGeometry args={[0.058, 26, 20]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.62, 0]} geometry={heartGeo} material={innerCore} ref={heart} />
    </group>
  );
}
