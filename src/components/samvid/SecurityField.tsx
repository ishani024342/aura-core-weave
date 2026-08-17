import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { shellPanel } from "@/lib/samvid/geometry";
import { hologramMaterial, PALETTE } from "@/lib/samvid/materials";
import type { Sys } from "@/lib/samvid/state";

type Panel = {
  geo: THREE.BufferGeometry;
  rot: [number, number, number];
  speed: number;
  axis: "x" | "y" | "z";
};

export function SecurityField({ sys }: { sys: React.MutableRefObject<Sys> }) {
  const group = useRef<THREE.Group>(null!);

  const panels = useMemo<Panel[]>(() => {
    const spec: Array<[number, number, number, number, number, [number, number, number], number, "x" | "y" | "z"]> = [
      [1.75, 0.2, 1.5, 0.35, 1.0, [0.2, 0, 0.3], 0.11, "y"],
      [1.95, 2.6, 1.9, 0.9, 0.85, [-0.35, 0.4, -0.2], -0.08, "y"],
      [2.2, 4.4, 1.2, 0.5, 1.3, [0.6, 0, 0.15], 0.06, "z"],
      [2.45, 1.2, 2.4, 1.1, 0.7, [-0.2, 0.9, 0.5], -0.05, "x"],
      [2.75, 3.4, 1.7, 0.3, 1.1, [0.15, -0.4, -0.35], 0.04, "y"],
      [3.05, 5.2, 2.1, 0.75, 0.95, [-0.5, 0.2, 0.25], -0.03, "z"],
    ];
    return spec.map(([r, phi, phiL, th, thL, rot, speed, axis]) => ({
      geo: shellPanel(r, phi, phiL, th, thL),
      rot,
      speed,
      axis,
    }));
  }, []);

  const panelMat = useMemo(
    () => hologramMaterial({ color: PALETTE.field, inner: PALETTE.deep, opacity: 0.28, scan: 1.4, breath: 0.6 }),
    [],
  );
  const innerShellMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.core,
        wireframe: true,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const trailMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.field,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const shellA = useRef<THREE.Mesh>(null!);
  const shellB = useRef<THREE.Mesh>(null!);
  const trails = useRef<THREE.Group>(null!);
  const panelRefs = useRef<THREE.Mesh[]>([]);

  const sparks = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 1.6 + Math.random() * 1.6;
      const th = Math.acos(2 * Math.random() - 1);
      const ph = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(th) * Math.cos(ph);
      pos[i * 3 + 1] = r * Math.cos(th);
      pos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const sparkMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: PALETTE.core,
        size: 0.022,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const sparkRef = useRef<THREE.Points>(null!);

  useFrame((_, dt) => {
    const t = sys.current.time;
    const p = sys.current.phase;
    panelMat.uniforms["uTime"]!.value = t;
    panelMat.uniforms["uPulse"]!.value = sys.current.pulse * 0.6;
    panelMat.uniforms["uOpacity"]!.value = 0.05 + p * 0.3;
    innerShellMat.opacity = 0.02 + p * 0.07;
    trailMat.opacity = 0.05 + p * 0.32;
    sparkMat.opacity = 0.1 + p * 0.6;

    if (group.current) {
      const s = 0.22 + p * 0.9 + sys.current.pulse * 0.08;
      group.current.scale.setScalar(s);
      group.current.rotation.y += dt * 0.05;
    }
    panelRefs.current.forEach((m, i) => {
      const spec = panels[i];
      if (!m || !spec) return;
      m.rotation[spec.axis] += dt * spec.speed;
    });
    if (shellA.current) shellA.current.rotation.y -= dt * 0.07;
    if (shellB.current) {
      shellB.current.rotation.x += dt * 0.05;
      shellB.current.rotation.z -= dt * 0.03;
    }
    if (trails.current) {
      trails.current.rotation.y += dt * 0.18;
      trails.current.rotation.x = Math.sin(t * 0.2) * 0.35;
    }
    if (sparkRef.current) {
      sparkRef.current.rotation.y += dt * 0.09;
      sparkRef.current.rotation.x -= dt * 0.03;
    }
  });

  return (
    <group ref={group}>
      {panels.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) panelRefs.current[i] = m;
          }}
          geometry={p.geo}
          material={panelMat}
          rotation={p.rot}
          raycast={() => null}
        />
      ))}

      <mesh ref={shellA} material={innerShellMat} raycast={() => null}>
        <icosahedronGeometry args={[1.55, 2]} />
      </mesh>
      <mesh ref={shellB} material={innerShellMat} raycast={() => null}>
        <icosahedronGeometry args={[3.1, 3]} />
      </mesh>

      <group ref={trails}>
        {[
          { r: 2.1, rot: [1.2, 0.3, 0] },
          { r: 2.6, rot: [0.2, 0.9, 0.7] },
          { r: 3.0, rot: [-0.7, 0.2, 1.1] },
        ].map((t, i) => (
          <mesh key={i} material={trailMat} rotation={t.rot as [number, number, number]} raycast={() => null}>
            <torusGeometry args={[t.r, 0.006, 6, 220]} />
          </mesh>
        ))}
      </group>

      <points ref={sparkRef} geometry={sparks} material={sparkMat} raycast={() => null} />
    </group>
  );
}
