import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { hologramMaterial, PALETTE } from "@/lib/samvid/materials";
import { ATTRIBUTES, ORGANIZATIONS, v3, type ConsentState, type Sys } from "@/lib/samvid/state";

function ConsentPath({
  sys,
  from,
  to,
  state,
}: {
  sys: React.MutableRefObject<Sys>;
  from: THREE.Vector3;
  to: THREE.Vector3;
  state: ConsentState;
}) {
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y += 0.7;
    mid.multiplyScalar(1.08);
    return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
  }, [from, to]);

  const DASHES = 26;
  const PARTICLES = 14;
  const dashes = useRef<THREE.Mesh[]>([]);
  const parts = useRef<THREE.Mesh[]>([]);
  const life = useRef(0);
  const break0 = useRef(0);
  const drift = useMemo(
    () =>
      Array.from({ length: DASHES }, () =>
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.2) * 1.4,
          (Math.random() - 0.5) * 1.6,
        ),
      ),
    [],
  );

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.data,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const dotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.core,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((_, dt) => {
    const opening = state === "granted";
    life.current = THREE.MathUtils.clamp(life.current + (opening ? dt * 1.6 : -dt * 0.6), 0, 1);
    if (state === "revoking") break0.current = Math.min(1, break0.current + dt * 0.8);
    else break0.current = Math.max(0, break0.current - dt * 2.5);
    const brk = break0.current;

    mat.color.copy(brk > 0.02 ? PALETTE.alert : PALETTE.data);
    mat.opacity = (0.55 * life.current + 0.5 * brk) * (1 - brk * 0.9);
    dotMat.opacity = 0.9 * life.current * (1 - brk);

    dashes.current.forEach((m, i) => {
      if (!m) return;
      const t = (i + 0.5) / DASHES;
      const reach = life.current;
      const visible = t <= reach;
      const p = curve.getPointAt(Math.min(0.999, t));
      m.position.copy(p).addScaledVector(drift[i]!, brk * brk * 1.6);
      m.scale.setScalar(visible ? (1 - brk) * 1 : 0.001);
      m.lookAt(curve.getPointAt(Math.min(0.999, t + 0.02)));
      m.rotation.z += dt * brk * 3;
    });

    parts.current.forEach((m, i) => {
      if (!m) return;
      const speed = 0.22 * (1 - brk);
      const t = (sys.current.time * speed + i / PARTICLES) % 1;
      m.position.copy(curve.getPointAt(Math.min(0.999, t * life.current)));
      m.scale.setScalar(life.current * (1 - brk));
    });
  });

  return (
    <group>
      {Array.from({ length: DASHES }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) dashes.current[i] = m;
          }}
          material={mat}
          raycast={() => null}
        >
          <boxGeometry args={[0.02, 0.02, 0.09]} />
        </mesh>
      ))}
      {Array.from({ length: PARTICLES }, (_, i) => (
        <mesh
          key={`p${i}`}
          ref={(m) => {
            if (m) parts.current[i] = m;
          }}
          material={dotMat}
          raycast={() => null}
        >
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function OrgNode({
  sys,
  label,
  target,
  state,
  onToggle,
  index,
}: {
  sys: React.MutableRefObject<Sys>;
  label: string;
  target: THREE.Vector3;
  state: ConsentState;
  onToggle: () => void;
  index: number;
}) {
  const g = useRef<THREE.Group>(null!);
  const spin = useRef<THREE.Group>(null!);
  const [hover, setHover] = useState(false);
  const tag = useRef<HTMLSpanElement>(null);
  const mat = useMemo(
    () => hologramMaterial({ color: PALETTE.org, inner: PALETTE.deep, opacity: 0.7, scan: 0.5, breath: 0.3 }),
    [],
  );
  const frameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.org,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((_, dt) => {
    const p = Math.max(0, (sys.current.phase - 0.55) / 0.45);
    mat.uniforms["uTime"]!.value = sys.current.time;
    mat.uniforms["uOpacity"]!.value = p * (state === "granted" ? 0.95 : 0.6);
    frameMat.opacity = p * (hover ? 0.6 : 0.28);
    if (g.current) {
      const want = target.clone().multiplyScalar(0.55 + p * 0.45);
      want.y += Math.sin(sys.current.time * 0.5 + index) * 0.08 * p;
      g.current.position.lerp(want, 1 - Math.exp(-4 * dt));
      g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, p * (hover ? 1.12 : 1) + 0.001, 6, dt));
    }
    if (tag.current) tag.current.style.opacity = String(p);
    if (spin.current) spin.current.rotation.y += dt * 0.25;
  });

  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation();
        if (sys.current.phase > 0.7) onToggle();
      }}
      onPointerOver={() => {
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "default";
      }}
    >
      <group ref={spin}>
        <mesh material={mat}>
          <cylinderGeometry args={[0.16, 0.24, 0.34, 6]} />
        </mesh>
        <mesh material={frameMat} scale={1.5}>
          <cylinderGeometry args={[0.16, 0.24, 0.34, 6]} />
        </mesh>
        <mesh material={frameMat} position={[0, 0.3, 0]}>
          <octahedronGeometry args={[0.09, 0]} />
        </mesh>
      </group>
      <Html center distanceFactor={9} position={[0, -0.42, 0]} zIndexRange={[10, 0]} wrapperClass="samvid-label-layer" style={{ pointerEvents: "none" }}>
        <span ref={tag} className={`samvid-tag is-org ${state === "granted" ? "is-granted" : ""}`}>
          {label}
          <em>{state === "granted" ? "consent active — click to revoke" : "click to grant consent"}</em>
        </span>
      </Html>
    </group>
  );
}

export function Organizations({
  sys,
  consents,
  onToggle,
}: {
  sys: React.MutableRefObject<Sys>;
  consents: Record<string, ConsentState>;
  onToggle: (id: string) => void;
}) {
  const attrPos = useMemo(
    () => Object.fromEntries(ATTRIBUTES.map((a) => [a.id, v3(a.pos)])) as Record<string, THREE.Vector3>,
    [],
  );
  return (
    <group>
      {ORGANIZATIONS.map((o, i) => {
        const state = consents[o.id] ?? "idle";
        return (
          <group key={o.id}>
            <OrgNode
              sys={sys}
              index={i}
              label={o.label}
              target={v3(o.pos)}
              state={state}
              onToggle={() => onToggle(o.id)}
            />
            {state !== "idle" && (
              <ConsentPath
                sys={sys}
                from={attrPos[o.attr]!.clone().multiplyScalar(1.1)}
                to={v3(o.pos)}
                state={state}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
