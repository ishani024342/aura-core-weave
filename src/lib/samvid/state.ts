import * as THREE from "three";

export type Sys = {
  /** 0 = locked/minimized human, 1 = fully expanded identity universe */
  phase: number;
  /** target for phase */
  target: number;
  /** transient energy pulse emitted from the human */
  pulse: number;
  time: number;
};

export const ATTRIBUTES = [
  { id: "identity", label: "IDENTITY", pos: [0.0, 1.25, 1.05] },
  { id: "academic", label: "ACADEMIC", pos: [-1.35, 0.75, 0.35] },
  { id: "employment", label: "EMPLOYMENT", pos: [1.4, 0.45, -0.4] },
  { id: "financial", label: "FINANCIAL", pos: [-1.15, -0.35, -0.95] },
  { id: "medical", label: "MEDICAL", pos: [1.05, -0.6, 0.95] },
  { id: "legal", label: "LEGAL", pos: [-0.35, -1.15, 0.75] },
  { id: "research", label: "RESEARCH", pos: [0.55, 1.05, -1.15] },
  { id: "corporate", label: "CORPORATE", pos: [-0.9, 0.15, 1.35] },
] as const;

export const ORGANIZATIONS = [
  { id: "company", label: "COMPANY", attr: "employment", pos: [3.5, 0.9, -0.9] },
  { id: "university", label: "UNIVERSITY", attr: "academic", pos: [-3.4, 1.3, 0.6] },
  { id: "bank", label: "BANK", attr: "financial", pos: [-2.9, -1.2, -2.0] },
  { id: "hospital", label: "HOSPITAL", attr: "medical", pos: [2.7, -1.4, 1.9] },
  { id: "research-org", label: "RESEARCH ORG", attr: "research", pos: [1.2, 2.3, -3.0] },
] as const;

export type ConsentState = "idle" | "granted" | "revoking";

export const v3 = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2]);

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, dt);
