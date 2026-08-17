import * as THREE from "three";

/**
 * Builds a smooth tapered tube along a Catmull-Rom curve.
 * Used to sculpt limbs / neck of the digital human so the body
 * reads as one continuous volumetric form (not stacked capsules).
 */
export function taperedTube(
  points: [number, number, number][],
  radii: number[],
  tubularSegments = 48,
  radialSegments = 20,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "catmullrom",
    0.4,
  );
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  const radiusAt = (t: number) => {
    const x = t * (radii.length - 1);
    const i = Math.min(radii.length - 2, Math.floor(x));
    const f = x - i;
    return (radii[i] ?? 0) * (1 - f) + (radii[i + 1] ?? 0) * f;
  };

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const V = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i] ?? new THREE.Vector3(1, 0, 0));
    B.copy(frames.binormals[i] ?? new THREE.Vector3(0, 0, 1));
    const r = radiusAt(t);
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(a);
      const cos = -Math.cos(a);
      V.set(
        cos * N.x + sin * B.x,
        cos * N.y + sin * B.y,
        cos * N.z + sin * B.z,
      );
      normal.push(V.x, V.y, V.z);
      position.push(P.x + r * V.x, P.y + r * V.y, P.z + r * V.z);
      uv.push(t, j / radialSegments);
    }
  }

  for (let i = 1; i <= tubularSegments; i++) {
    for (let j = 1; j <= radialSegments; j++) {
      const a = (radialSegments + 1) * (i - 1) + (j - 1);
      const b = (radialSegments + 1) * i + (j - 1);
      const c = (radialSegments + 1) * i + j;
      const d = (radialSegments + 1) * (i - 1) + j;
      index.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** Body-of-revolution torso, flattened on Z so it reads anatomically. */
export function torsoGeometry(segments = 64): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.001, -0.05],
    [0.19, 0.0],
    [0.215, 0.16],
    [0.2, 0.34],
    [0.17, 0.5],
    [0.175, 0.66],
    [0.215, 0.82],
    [0.26, 0.98],
    [0.255, 1.1],
    [0.16, 1.18],
    [0.001, 1.2],
  ];
  const geo = new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
  geo.scale(1, 1, 0.62);
  return geo;
}

/** Softly abstracted, identity-neutral head. */
export function headGeometry(detail = 48): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.145, detail, Math.round(detail * 0.8));
  geo.scale(0.92, 1.18, 0.95);
  geo.translate(0, 1.44, 0.01);
  return geo;
}

/** A curved shell panel of the security field (portion of a sphere). */
export function shellPanel(
  radius: number,
  phi: number,
  phiLength: number,
  theta: number,
  thetaLength: number,
): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, 64, 48, phi, phiLength, theta, thetaLength);
}
