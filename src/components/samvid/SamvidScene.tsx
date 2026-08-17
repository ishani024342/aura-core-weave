import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DigitalHuman } from "./DigitalHuman";
import { SecurityField } from "./SecurityField";
import { DataAttributes } from "./DataAttributes";
import { Organizations } from "./Organizations";
import { PALETTE } from "@/lib/samvid/materials";
import { ATTRIBUTES, ORGANIZATIONS, type ConsentState, type Sys } from "@/lib/samvid/state";

function Ambient({ sys }: { sys: React.MutableRefObject<Sys> }) {
  const geo = useMemo(() => {
    const n = 1200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: PALETTE.deep,
        size: 0.03,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const ref = useRef<THREE.Points>(null!);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012;
    mat.opacity = 0.35 + sys.current.phase * 0.25;
  });
  return <points ref={ref} geometry={geo} material={mat} raycast={() => null} />;
}

/** Expanding energy shockwave emitted by the human on activation. */
function Shockwave({ sys }: { sys: React.MutableRefObject<Sys> }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.core,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const wave = useRef(0);
  const last = useRef(0);
  useFrame((_, dt) => {
    if (sys.current.pulse > last.current + 0.2) wave.current = 0.001;
    last.current = sys.current.pulse;
    if (wave.current > 0) {
      wave.current += dt * 1.9;
      if (wave.current > 1) wave.current = 0;
    }
    const w = wave.current;
    mat.opacity = w > 0 ? Math.sin(w * Math.PI) * 0.35 : 0;
    if (mesh.current) mesh.current.scale.setScalar(0.2 + w * 4.2);
  });
  return (
    <mesh ref={mesh} material={mat} raycast={() => null}>
      <sphereGeometry args={[1, 40, 28]} />
    </mesh>
  );
}

function Rig({ sys }: { sys: React.MutableRefObject<Sys> }) {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const s = sys.current;
    s.time = state.clock.elapsedTime;
    s.phase = THREE.MathUtils.damp(s.phase, s.target, 1.6, dt);
    s.pulse = Math.max(0, s.pulse - dt * 1.1);
    const dist = 5.2 + s.phase * 3.6;
    const cur = camera.position.length();
    camera.position.multiplyScalar(THREE.MathUtils.damp(cur, dist, 2, dt) / cur);
  });
  return null;
}

export default function SamvidScene() {
  const sys = useRef<Sys>({ phase: 0, target: 0, pulse: 0, time: 0 });
  const [expanded, setExpanded] = useState(false);
  const [consents, setConsents] = useState<Record<string, ConsentState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activate = useCallback(() => {
    sys.current.pulse = 1;
    setExpanded((e) => {
      const next = !e;
      sys.current.target = next ? 1 : 0;
      if (!next) setConsents({});
      return next;
    });
  }, []);

  const toggleConsent = useCallback((id: string) => {
    setConsents((c) => {
      const cur = c[id] ?? "idle";
      if (cur === "granted") {
        timers.current[id] = setTimeout(
          () => setConsents((x) => ({ ...x, [id]: "idle" })),
          2600,
        );
        return { ...c, [id]: "revoking" };
      }
      if (cur === "revoking") return c;
      return { ...c, [id]: "granted" };
    });
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const activeAttrs = useMemo(
    () =>
      ORGANIZATIONS.filter((o) => consents[o.id] === "granted").map((o) => o.attr as string),
    [consents],
  );

  const grantedCount = activeAttrs.length;

  return (
    <div className="samvid-stage">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.6, 5.2], fov: 42 }}
        dpr={[1, 2]}
        onPointerMissed={() => undefined}
      >
        <fog attach="fog" args={["#03060f", 8, 26]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 5]} intensity={12} color={PALETTE.core} distance={30} />
        <pointLight position={[-4, -2, -4]} intensity={8} color={PALETTE.deep} distance={30} />
        <Rig sys={sys} />
        <Ambient sys={sys} />
        <Shockwave sys={sys} />
        <DigitalHuman sys={sys} onActivate={activate} />
        <SecurityField sys={sys} />
        <DataAttributes sys={sys} activeIds={activeAttrs} />
        <Organizations sys={sys} consents={consents} onToggle={toggleConsent} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          minDistance={3}
          maxDistance={14}
          autoRotate
          autoRotateSpeed={0.28}
        />
      </Canvas>

      <div className="samvid-hud">
        <header>
          <span className="samvid-mark">SAMVID</span>
          <span className="samvid-sub">sovereign digital identity field</span>
        </header>
        <footer>
          <p className="samvid-state">
            {expanded ? "IDENTITY FIELD ACTIVE" : "IDENTITY LOCKED"}
            <em>
              {expanded
                ? `${ATTRIBUTES.length} attributes inside the field · ${grantedCount} consent link${grantedCount === 1 ? "" : "s"} open`
                : "touch the figure to unseal the protective field"}
            </em>
          </p>
          <p className="samvid-hint">
            {expanded
              ? "Select an organization node to grant consent · select again to revoke · touch the figure to seal"
              : "Drag to orbit the space"}
          </p>
        </footer>
      </div>
    </div>
  );
}
