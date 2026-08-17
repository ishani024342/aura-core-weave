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

  const surface = useMemo(
    () => hologramMaterial({ color: PALETTE.core, inner: PALETTE.deep, opacity: 0.55 }),
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
  const wireMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: PALETTE.field,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const bodies = useMemo(
    () =>
      parts.map((g, i) => ({
        geo: g,
        wire: new THREE.WireframeGeometry(wireSources[i] ?? g),
      })),
    [parts, wireSources],
  );

  const heartGeo = useMemo(() => new THREE.IcosahedronGeometry(0.085, 1), []);
  const heart = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const t = sys.current.time;
    const p = sys.current.phase;
    surface.uniforms['uTime']!.value = t;
    innerCore.uniforms['uTime']!.value = t;
    surface.uniforms['uPulse']!.value = sys.current.pulse * 0.9;
    innerCore.uniforms['uPulse']!.value = sys.current.pulse;
    wireMat.opacity = 0.06 + sys.current.pulse * 0.2 + p * 0.04;

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
      {bodies.map((b, i) => (
        <group key={i}>
          <mesh geometry={b.geo} material={surface} />
          <mesh geometry={b.geo} material={innerCore} scale={0.9} />
          <lineSegments geometry={b.wire} material={wireMat} />
        </group>
      ))}
      <mesh position={[0, 0.62, 0]} geometry={heartGeo} material={innerCore} ref={heart} />
    </group>
  );
}
