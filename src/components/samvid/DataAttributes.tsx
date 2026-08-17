import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { hologramMaterial, PALETTE } from "@/lib/samvid/materials";
import { ATTRIBUTES, v3, type Sys } from "@/lib/samvid/state";

function Attribute({
  sys,
  index,
  label,
  target,
  active,
}: {
  sys: React.MutableRefObject<Sys>;
  index: number;
  label: string;
  target: THREE.Vector3;
  active: boolean;
}) {
  const g = useRef<THREE.Group>(null!);
  const spin = useRef<THREE.Group>(null!);
  const tag = useRef<HTMLSpanElement>(null);
  const mat = useMemo(
    () => hologramMaterial({ color: PALETTE.data, inner: PALETTE.deep, opacity: 0.9, breath: 0.4 }),
    [],
  );
  const sheetMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.data,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const edgeMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: PALETTE.data,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const sheetEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.28, 0.38)),
    [],
  );

  useFrame((_, dt) => {
    const p = sys.current.phase;
    const t = sys.current.time;
    mat.uniforms["uTime"]!.value = t;
    mat.uniforms["uOpacity"]!.value = 0.15 + p * 0.85;
    sheetMat.opacity = p * (active ? 0.3 : 0.16);
    edgeMat.opacity = p * (active ? 0.85 : 0.45);
    if (g.current) {
      const drift = new THREE.Vector3(
        Math.sin(t * 0.4 + index) * 0.06,
        Math.sin(t * 0.53 + index * 2) * 0.08,
        Math.cos(t * 0.37 + index) * 0.06,
      );
      const want = target.clone().multiplyScalar(0.15 + p * 0.95).add(drift.multiplyScalar(p));
      g.current.position.lerp(want, 1 - Math.exp(-5 * dt));
      g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, 0.05 + p * (active ? 1.15 : 1), 6, dt));
    }
    if (tag.current) {
      tag.current.style.opacity = String(Math.max(0, (p - 0.5) / 0.5) * (active ? 1 : 0.7));
    }
    if (spin.current) {
      spin.current.rotation.y += dt * 0.5;
      spin.current.rotation.x = Math.sin(t * 0.6 + index) * 0.25;
    }
  });

  return (
    <group ref={g}>
      <group ref={spin}>
        <mesh material={mat} raycast={() => null}>
          <octahedronGeometry args={[0.14, 0]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
            <mesh position={[0.19, i * 0.04 - 0.04, 0]} material={sheetMat} raycast={() => null}>
              <planeGeometry args={[0.28, 0.38]} />
            </mesh>
            <lineSegments
              geometry={sheetEdges}
              material={edgeMat}
              position={[0.19, i * 0.04 - 0.04, 0]}
            />
          </group>
        ))}
      </group>
      <Html center distanceFactor={7} position={[0, 0.36, 0]} zIndexRange={[10, 0]} wrapperClass="samvid-label-layer" style={{ pointerEvents: "none" }}>
        <span ref={tag} className={`samvid-tag ${active ? "is-active" : ""}`}>
          {label}
        </span>
      </Html>
    </group>
  );
}

function ChainLink({
  sys,
  a,
  b,
  seed,
}: {
  sys: React.MutableRefObject<Sys>;
  a: THREE.Vector3;
  b: THREE.Vector3;
  seed: number;
}) {
  const curve = useMemo(() => {
    const mid = a.clone().add(b).multiplyScalar(0.5).multiplyScalar(1.28);
    return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  }, [a, b]);

  const blocks = useRef<THREE.Group>(null!);
  const packet = useRef<THREE.Mesh>(null!);
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.006, 5, false), [curve]);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.chain,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const nodes = useMemo(() => [0.18, 0.36, 0.54, 0.72, 0.88].map((t) => curve.getPointAt(t)), [curve]);

  useFrame(() => {
    const p = Math.max(0, (sys.current.phase - 0.45) / 0.55);
    mat.opacity = p * 0.3;
    if (blocks.current) blocks.current.scale.setScalar(Math.max(0.001, p));
    if (packet.current) {
      const t = (sys.current.time * 0.18 + seed * 0.31) % 1;
      packet.current.position.copy(curve.getPointAt(t));
      packet.current.scale.setScalar(p);
    }
  });

  return (
    <group scale={sys.current.phase > 0 ? 1 : 1}>
      <mesh geometry={tubeGeo} material={mat} raycast={() => null} />
      <group ref={blocks}>
        {nodes.map((n, i) => (
          <mesh key={i} position={n} rotation={[i * 0.6, i * 0.9, 0]} material={mat} raycast={() => null}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
          </mesh>
        ))}
      </group>
      <mesh ref={packet} material={mat} raycast={() => null}>
        <sphereGeometry args={[0.022, 8, 8]} />
      </mesh>
    </group>
  );
}

export function DataAttributes({
  sys,
  activeIds,
}: {
  sys: React.MutableRefObject<Sys>;
  activeIds: string[];
}) {
  const positions = useMemo(() => ATTRIBUTES.map((a) => v3(a.pos)), []);
  return (
    <group>
      {ATTRIBUTES.map((a, i) => (
        <Attribute
          key={a.id}
          sys={sys}
          index={i}
          label={a.label}
          target={positions[i]!}
          active={activeIds.includes(a.id)}
        />
      ))}
      {positions.map((p, i) => (
        <ChainLink
          key={i}
          sys={sys}
          a={p.clone().multiplyScalar(1.1)}
          b={positions[(i + 1) % positions.length]!.clone().multiplyScalar(1.1)}
          seed={i}
        />
      ))}
    </group>
  );
}
