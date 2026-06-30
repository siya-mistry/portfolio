import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, CSSProperties } from "react";
import { Canvas, useFrame, useThree, invalidate } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { buildLeaves, type Leaf } from "../lib/pageRenderers";
import { ContentPanel, type Section } from "./ContentPanels";
import CinematicBackground from "./CinematicBackground";

const PAGE_W = 2.0;
const PAGE_H = (PAGE_W * 1440) / 1080;
const PAGE_DEPTH = 0.055; // thicker leaves so the open book reads with real heft
const SEGMENTS = 20;
const SEG_W = PAGE_W / SEGMENTS;

const STACK_GAP = 0.05;
const LIFT = 0.55;
const CURL = 0.7;
const REST = 0.06;

// One-time device class for GPU perf tuning. A phone can't afford the desktop
// scene's clearcoat physical material, MSAA, or 1.5× DPR — so on touch/small
// screens we render a lighter version. Evaluated once (device class is stable).
const IS_MOBILE = typeof window !== "undefined" && window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;

// How far to pull the camera in on mobile so page text is legible (1 = no zoom).
// 0.82 ≈ 18% larger; lower = bigger text but more outer-margin crop.
const MOBILE_PAGE_ZOOM = IS_MOBILE ? 0.82 : 1;

// Each chapter gets its own signature "exit" as its clickable info takes over.
// One cinematic language (a downward descent) — four different executions.
type Move = "tumble" | "dive" | "layback" | "liftaway";

type Seg =
  | { kind: "hold"; pv: number; w: number }
  | { kind: "turn"; a: number; b: number; w: number }
  | { kind: "chapter"; pv: number; section: Section; move: Move; enter: number; read: number; exit: number; w: number };

// Fixed cinematic budgets (vh of scroll). A chapter's READ budget is DYNAMIC:
// it equals the section content's overflow, so the content pans 1:1 with the
// page scroll — and collapses to ZERO when the content already fits the viewport
// (no dead "separate" scroll). See buildTimeline + the overflow measurement.
const LEAD_W = 80; // opening hold on the cover
const OPEN_W = 90; // book opens / closes (first & last turn)
const TURN_W = 86; // a page flip between chapters
const TAIL_W = 90; // closing hold
const ENTER_W = 104; // panel reveals in as the book performs its exit
const EXIT_W = 92; // panel leaves as the next page arrives
const DEFAULT_READ = 110; // read budget for a section not yet measured

const CHAPTERS: Array<{ section: Section; move: Move }> = [
  { section: "about", move: "tumble" },
  { section: "projects", move: "dive" },
  { section: "experience", move: "layback" },
  { section: "contact", move: "liftaway" },
];

type Timeline = { segs: Seg[]; total: number };

// readVh maps each section to the vh of scroll its content needs to pan through
// (0 when it fits the viewport). The journey is rebuilt whenever a measurement
// lands, so the scroll length always matches the real content.
function buildTimeline(readVh: Partial<Record<Section, number>>): Timeline {
  const segs: Seg[] = [
    { kind: "hold", pv: 0, w: LEAD_W },
    { kind: "turn", a: 0, b: 1, w: OPEN_W },
  ];
  CHAPTERS.forEach((c, i) => {
    const read = Math.max(0, readVh[c.section] ?? DEFAULT_READ);
    segs.push({ kind: "chapter", pv: i + 1, section: c.section, move: c.move, enter: ENTER_W, read, exit: EXIT_W, w: ENTER_W + read + EXIT_W });
    segs.push({ kind: "turn", a: i + 1, b: i + 2, w: i < CHAPTERS.length - 1 ? TURN_W : OPEN_W });
  });
  segs.push({ kind: "hold", pv: CHAPTERS.length + 1, w: TAIL_W });
  const total = segs.reduce((s, x) => s + x.w, 0);
  return { segs, total };
}

type Frame = { pv: number; reveal: number; read: number; section: Section; move: Move; descend: number };

function frameAt(pos: number, tl: Timeline): Frame {
  const { segs, total } = tl;
  let acc = 0;
  const descend = THREE.MathUtils.clamp(pos / total, 0, 1);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const last = i === segs.length - 1;
    if (pos < acc + seg.w || last) {
      const local = pos - acc;
      if (seg.kind === "hold") return { pv: seg.pv, reveal: 0, read: 0, section: "about", move: "tumble", descend };
      if (seg.kind === "turn") {
        const t = THREE.MathUtils.clamp(local / seg.w, 0, 1);
        return { pv: THREE.MathUtils.lerp(seg.a, seg.b, smoothstep(t)), reveal: 0, read: 0, section: "about", move: "tumble", descend };
      }
      // chapter: reveal IN (book exits) → READ (content pans 1:1) → reveal OUT
      let reveal: number;
      let read: number;
      if (local < seg.enter) {
        reveal = smoothstep(local / seg.enter);
        read = 0;
      } else if (local < seg.enter + seg.read) {
        reveal = 1;
        read = seg.read > 0 ? (local - seg.enter) / seg.read : 0;
      } else {
        reveal = 1 - smoothstep((local - seg.enter - seg.read) / seg.exit);
        read = 1;
      }
      return { pv: seg.pv, reveal, read, section: seg.section, move: seg.move, descend };
    }
    acc += seg.w;
  }
  return { pv: 0, reveal: 0, read: 0, section: "about", move: "tumble", descend: 0 };
}

// A nav stop the page-tab rail can flip to: the cover, each chapter's magazine
// SPREAD (landed at reveal≈0, before the content cards rise), and the back cover.
type Stop = { key: string; label: string; pv: number; frac: number };

const SECTION_LABEL: Record<Section, string> = {
  about: "About",
  projects: "Work",
  experience: "Experience",
  contact: "Contact",
};

// Ordered stops derived from the timeline. A chapter stop's `frac` is the scroll
// position where its page has just turned open (reveal 0); `pv` is the book's page
// value there, which the flip animation tweens toward.
function buildStops(tl: Timeline): Stop[] {
  const stops: Stop[] = [{ key: "cover", label: "Cover", pv: 0, frac: 0 }];
  let acc = 0;
  for (const seg of tl.segs) {
    if (seg.kind === "chapter") {
      stops.push({ key: seg.section, label: SECTION_LABEL[seg.section], pv: seg.pv, frac: acc / tl.total });
    }
    acc += seg.w;
  }
  const last = tl.segs[tl.segs.length - 1]; // closing hold = back cover
  const backPv = last.kind === "hold" ? last.pv : CHAPTERS.length + 1;
  stops.push({ key: "back", label: "Back", pv: backPv, frac: (tl.total - last.w) / tl.total });
  return stops;
}

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function smoothstep(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function dampAngle(holder: THREE.Euler, key: "y", target: number, lambda: number, dt: number): void {
  const cur = holder[key];
  let diff = target - cur;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  holder[key] = cur + diff * (1 - Math.exp(-lambda * dt));
}

function leafTurn(pv: number, k: number): number {
  return THREE.MathUtils.clamp(pv - 2 * k, 0, 1);
}

type Page = { mesh: THREE.SkinnedMesh; bones: THREE.Bone[] };

function makePage(front: THREE.Texture, back: THREE.Texture): Page {
  const geo = new THREE.BoxGeometry(PAGE_W, PAGE_H, PAGE_DEPTH, SEGMENTS, 2, 1);
  geo.translate(PAGE_W / 2, 0, 0);

  const pos = geo.attributes.position;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const seg = Math.max(0, Math.min(SEGMENTS - 1, Math.floor(x / SEG_W)));
    const frac = THREE.MathUtils.clamp((x - seg * SEG_W) / SEG_W, 0, 1);
    skinIndices.push(seg, Math.min(seg + 1, SEGMENTS), 0, 0);
    skinWeights.push(1 - frac, frac, 0, 0);
  }
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  const bones: THREE.Bone[] = [];
  let prev: THREE.Bone | null = null;
  for (let i = 0; i <= SEGMENTS; i++) {
    const b = new THREE.Bone();
    b.position.x = i === 0 ? 0 : SEG_W;
    if (prev) prev.add(b);
    bones.push(b);
    prev = b;
  }
  const skeleton = new THREE.Skeleton(bones);

  const white = new THREE.Color(0xffffff);
  // Page edges (fore-edge, top, bottom) — slightly deeper cream than the face so
  // the leaf thickness reads as stacked paper; spine edge is darker (the gutter).
  const edge = new THREE.MeshStandardMaterial({ color: "#ddd1bd", roughness: 0.92 });
  const spine = new THREE.MeshStandardMaterial({ color: "#b9a892", roughness: 0.95 });
  // Glossy magazine stock: a clearcoat layer rides a specular sheen across the
  // page as it curls and turns, while the emissive map keeps the art legible.
  const face = (tex: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      map: tex,
      emissive: white,
      emissiveMap: tex,
      emissiveIntensity: 0.58,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      reflectivity: 0.6,
    });
  // BoxGeometry face order: +x (fore-edge), -x (spine), +y, -y, +z (front art), -z (back art)
  const mats = [edge, spine, edge, edge, face(front), face(back)];

  const mesh = new THREE.SkinnedMesh(geo, mats);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  mesh.frustumCulled = false;
  return { mesh, bones };
}

function Page3D({ page, index, count, progress, snap }: { page: Page; index: number; count: number; progress: MutableRefObject<number>; snap: MutableRefObject<boolean> }) {
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = leafTurn(progress.current, index);
    const base = -t * Math.PI;
    const curl = -Math.sin(t * Math.PI) * CURL;
    const { bones } = page;
    for (let i = 0; i < bones.length; i++) {
      let target = 0;
      if (i === 0) target += base;
      if (i > 0) target += (curl - REST) / SEGMENTS;
      if (snap.current) bones[i].rotation.y = target;
      else dampAngle(bones[i].rotation, "y", target, 9, dt);
    }
    const order = THREE.MathUtils.lerp(count - index, index, t);
    const lift = Math.sin(t * Math.PI) * LIFT;
    page.mesh.position.z = order * STACK_GAP + lift;
  });
  return <primitive object={page.mesh} />;
}

// Per-chapter signature exit of the whole book as its content takes over.
function moveTransform(move: Move, e: number) {
  switch (move) {
    case "tumble": // tips forward and falls away below
      return { px: 0, py: -e * 4.4, pz: e * 0.6, rx: e * 1.15, rz: 0, sc: 1 };
    case "dive": // surges up toward the lens like a portal
      return { px: 0, py: e * 1.7, pz: e * 0.9, rx: -e * 0.16, rz: 0, sc: 1 + e * 0.55 };
    case "layback": // lays back flat and sinks like a dealt card
      return { px: 0, py: -e * 3.6, pz: -e * 0.4, rx: -e * 1.25, rz: 0, sc: 1 };
    case "liftaway": // lifts and floats up out of frame
      return { px: 0, py: e * 4.6, pz: e * 0.3, rx: e * 0.28, rz: e * 0.08, sc: 1 - e * 0.22 };
  }
}

function BookRig({ leaves, progress, reveal, move, snap }: { leaves: Leaf[]; progress: MutableRefObject<number>; reveal: MutableRefObject<number>; move: MutableRefObject<Move>; snap: MutableRefObject<boolean> }) {
  const pages = useMemo(() => leaves.map((l) => makePage(l.front, l.back)), [leaves]);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.05);
    const e = smoothstep(reveal.current);
    const m = moveTransform(move.current, e);
    if (snap.current) {
      g.position.set(m.px, m.py, m.pz);
      g.rotation.x = m.rx;
      g.rotation.z = m.rz;
      g.scale.setScalar(m.sc);
      return;
    }
    const k = 7;
    g.position.x = THREE.MathUtils.damp(g.position.x, m.px, k, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, m.py, k, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, m.pz, k, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, m.rx, k, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, m.rz, k, dt);
    const s = THREE.MathUtils.damp(g.scale.x, m.sc, k, dt);
    g.scale.setScalar(s);
  });

  return (
    <group ref={group}>
      {pages.map((page, i) => (
        <Page3D key={i} page={page} index={i} count={pages.length} progress={progress} snap={snap} />
      ))}
      <ContactShadows position={[0, -PAGE_H / 2 - 0.04, 0]} scale={PAGE_W * 4} resolution={IS_MOBILE ? 128 : 256} blur={3} opacity={0.42} far={5} color="#5a2433" />
    </group>
  );
}

// Keeps the demand-mode render loop alive only while there's something to
// animate: scrolling pushes `wake` ~900ms into the future, and this requests a
// frame each tick until that window passes — then the canvas sleeps at 0 cost.
function RenderGovernor({ wake }: { wake: MutableRefObject<number> }) {
  useFrame((state) => {
    if (performance.now() < wake.current) state.invalidate();
  });
  return null;
}

function CameraRig({ progress, reveal, move, snap }: { progress: MutableRefObject<number>; reveal: MutableRefObject<number>; move: MutableRefObject<Move>; snap: MutableRefObject<boolean> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const state = useRef({ x: PAGE_W / 2, y: 0, dist: 6, look: 0 });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const pv = progress.current;
    const fl = Math.floor(pv);
    const ce = Math.ceil(pv);
    const frac = pv - fl;

    const centerX = (i: number) => (i % 2 === 0 ? PAGE_W / 2 : -PAGE_W / 2);
    const baseX = THREE.MathUtils.lerp(centerX(fl), centerX(ce), smoothstep(frac));

    const fov = (camera.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const tan = Math.tan(fov / 2);
    // On phones, pull the camera in ~18% so an open spread's baked text reads
    // larger (it only crops a sliver of outer page-margin whitespace). But ONLY on
    // the inner pages — the front/back covers stay full-frame (zooming them just
    // crops the cover art). `edge` is 0 at either cover and ramps to 1 one page in,
    // so the zoom eases on/off across the opening and closing turns.
    const maxPv = CHAPTERS.length + 1;
    const edge = THREE.MathUtils.clamp(Math.min(pv, maxPv - pv), 0, 1);
    const pageZoom = THREE.MathUtils.lerp(1, MOBILE_PAGE_ZOOM, smoothstep(edge));
    const fitOne = pageZoom * Math.max((PAGE_H * 1.1) / 2 / tan, (PAGE_W * 1.12) / 2 / (tan * aspect));
    const fitTurn = Math.max((PAGE_H * 1.25) / 2 / tan, (PAGE_W * 2.6) / 2 / (tan * aspect));

    let targetX = baseX;
    let targetY = 0;
    let targetDist = fitOne;
    let lookY = 0;

    if (frac > 0.0001) {
      const isFlip = fl % 2 === 0;
      const bump = Math.sin(frac * Math.PI);
      targetX = THREE.MathUtils.lerp(baseX, 0, bump * (isFlip ? 1 : 0.4));
      targetDist = fitOne + (fitTurn - fitOne) * bump * (isFlip ? 1 : 0.6);
    }

    // Chapter reveal: the camera follows the book's signature exit, so the
    // descent reads as a continuous cinematic move rather than a flat cut.
    const e = smoothstep(reveal.current);
    if (e > 0.0001) {
      const m = move.current;
      targetX = baseX;
      if (m === "tumble") {
        targetY = -e * 1.5;
        lookY = -e * 0.9;
        targetDist = fitOne * (1 + 0.3 * e);
      } else if (m === "dive") {
        targetY = e * 0.9;
        lookY = e * 0.5;
        targetDist = fitOne * (1 - 0.48 * e); // push IN through the page
      } else if (m === "layback") {
        targetY = e * 1.3;
        lookY = -e * 1.05;
        targetDist = fitOne * (1 + 0.36 * e);
      } else if (m === "liftaway") {
        targetY = e * 1.7;
        lookY = e * 1.1;
        targetDist = fitOne * (1 + 0.3 * e);
      }
    }

    const s = state.current;
    if (snap.current) {
      s.x = targetX;
      s.y = targetY;
      s.dist = targetDist;
      s.look = lookY;
    } else {
      s.x = THREE.MathUtils.damp(s.x, targetX, 6, dt);
      s.y = THREE.MathUtils.damp(s.y, targetY, 6, dt);
      s.dist = THREE.MathUtils.damp(s.dist, targetDist, 6, dt);
      s.look = THREE.MathUtils.damp(s.look, lookY, 6, dt);
    }
    camera.position.set(s.x, s.y, s.dist);
    camera.lookAt(s.x, s.look, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

const ACCENT_RED = "#9a1b3a";

// Stable style reference for the flip wrapper. MUST be a constant so React never
// re-applies the style attribute on re-render — otherwise it would wipe the
// imperative transform/transition that drives the flip-to-cover animation.
const FLIP_WRAP_STYLE = { position: "absolute", inset: 0, zIndex: 10, transformStyle: "preserve-3d" } as const;

// Floating monogram (top-left) — replaces the traditional bar.
function BrandMark({ onHome }: { onHome: () => void }) {
  return (
    <button
      onClick={onHome}
      style={{
        position: "fixed",
        top: 24,
        left: 30,
        zIndex: 50,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 26, letterSpacing: "0.01em", color: "#15130f", lineHeight: 1 }}>
        S<span style={{ color: ACCENT_RED }}>M</span>
      </span>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT_RED, display: "inline-block" }} />
    </button>
  );
}

// A single "Contents" pill that opens a full editorial table-of-contents over a
// dimmed book. Picking a line flips the book (page by page) to that page. Keeps
// the default UI to one element — zero overlap with the magazine art.
function ContentsNav({ stops, activeKey, onGo }: { stops: Stop[]; activeKey: string; onGo: (s: Stop) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (s: Stop) => {
    setOpen(false);
    onGo(s);
  };

  const glyphLine = (w: number) => <span style={{ width: w, height: 2, background: "currentColor", borderRadius: 2, transition: "width .3s ease" }} />;

  return (
    <>
      {/* trigger pill (top-right) */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          top: 24,
          right: 30,
          zIndex: 66,
          display: "inline-flex",
          alignItems: "center",
          gap: 11,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: open ? "#fff" : "#15130f",
          background: open ? "linear-gradient(105deg,#bb2350,#6e1226)" : "rgba(249,242,238,0.85)",
          border: "none",
          borderRadius: 999,
          padding: "11px 18px",
          cursor: "pointer",
          boxShadow: "0 10px 24px -12px rgba(74,16,34,0.45)",
          backdropFilter: "blur(4px)",
          transition: "background .3s ease, color .3s ease",
        }}
      >
        <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
          {glyphLine(16)}
          {glyphLine(open ? 16 : 10)}
          {glyphLine(16)}
        </span>
        {open ? "Close" : "Contents"}
      </button>

      {/* full-screen table of contents */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 65,
          background: "radial-gradient(125% 125% at 72% 28%, rgba(248,241,237,0.88), rgba(231,219,213,0.94))",
          backdropFilter: "blur(7px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .4s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${open ? 0 : 16}px)`,
            transition: "transform .45s cubic-bezier(.22,1,.36,1)",
            width: "min(560px, 86vw)",
          }}
        >
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase", color: ACCENT_RED, textAlign: "center", marginBottom: 4 }}>Issue 01</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "clamp(34px,6vw,54px)", color: "#15130f", textAlign: "center", margin: "0 0 20px" }}>Contents</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {stops.map((s, i) => {
              const on = s.key === activeKey;
              const hl = on || hover === s.key;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => pick(s)}
                    onMouseEnter={() => setHover(s.key)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 16,
                      background: "none",
                      border: "none",
                      borderTop: "1px solid rgba(110,18,38,0.14)",
                      cursor: "pointer",
                      padding: "13px 4px",
                      textAlign: "left",
                      color: hl ? ACCENT_RED : "#2a2420",
                      transform: `translateX(${hl ? 8 : 0}px)`,
                      transition: "transform .3s cubic-bezier(.22,1,.36,1), color .25s ease",
                    }}
                  >
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: ACCENT_RED, width: 30, flex: "none" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 600, fontSize: "clamp(21px,3.6vw,30px)", flex: "none" }}>{s.label}</span>
                    <span style={{ flex: 1, alignSelf: "center", borderBottom: `1px dotted ${hl ? "rgba(155,27,58,0.5)" : "rgba(110,18,38,0.22)"}`, margin: "0 4px" }} />
                    {on && <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: ACCENT_RED, flex: "none" }}>You&rsquo;re here</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}

// The content's entrance echoes the page's exit — rising, blooming, or settling.
function panelEntry(move: Move, o: number): CSSProperties {
  const inv = 1 - o;
  // container fades quickly so the per-line kinetic reveal (tied to o) leads
  const op = Math.min(1, o * 1.7);
  switch (move) {
    case "tumble":
      return { transform: `translateY(${inv * 52}px)`, opacity: op };
    case "dive":
      return { transform: `scale(${0.85 + 0.15 * o})`, opacity: op };
    case "layback":
      return { transform: `translateY(${inv * 60}px)`, opacity: op };
    case "liftaway":
      return { transform: `translateY(${-inv * 36}px) scale(${0.96 + 0.04 * o})`, opacity: op };
  }
}

type View = { section: Section; opacity: number; move: Move; frac: number; read: number };

const VIEW_VH = 0.9; // height of the panel viewport that content pans within

export default function Magazine() {
  const [leaves, setLeaves] = useState<Leaf[] | null>(null);
  const [view, setView] = useState<View>({ section: "about", opacity: 0, move: "tumble", frac: 0, read: 0 });
  const [atTop, setAtTop] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  // key of the stop a nav flip is heading to — highlights its tab instantly
  // (cleared once the flip lands and scroll re-syncs).
  const [navKey, setNavKey] = useState<string | null>(null);
  // mobile gets a little top breathing room so content clears the fixed nav pill
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // true while actively scrolling (debounced) — used to freeze the live preview
  // iframe from compositing during motion, the main mobile cost.
  const [scrolling, setScrolling] = useState(false);
  const [overflow, setOverflow] = useState(0);
  // Per-section content overflow (vh) → drives each chapter's read budget.
  const [readVh, setReadVh] = useState<Partial<Record<Section, number>>>({});
  const innerRef = useRef<HTMLDivElement>(null);
  const flipWrapRef = useRef<HTMLDivElement>(null);
  const snap = useRef(false);
  const flipping = useRef(false);
  // true while a nav page-flip is animating — freezes the scroll→book pipeline so
  // the controlled flip plays without the scroll handler fighting it.
  const navigating = useRef(false);
  const navRaf = useRef(0);
  const progress = useRef(0);
  const reveal = useRef(0);
  const move = useRef<Move>("tumble");
  const applyRef = useRef<() => void>(() => {});
  // demand-mode render budget: timestamp until which the canvas keeps rendering
  const wakeRef = useRef(0);

  const timeline = useMemo(() => buildTimeline(readVh), [readVh]);
  // Keep the latest timeline in a ref so the scroll handler reads it without
  // tearing down/rebuilding its rAF loop on every measurement.
  const tlRef = useRef(timeline);
  tlRef.current = timeline;

  // Nav stops (cover · chapters · back) and which tab is currently active.
  const stops = useMemo(() => buildStops(timeline), [timeline]);
  const activeKey = useMemo(() => {
    if (navKey) return navKey; // mid-flip: highlight the destination
    let best = Infinity;
    let key = stops[0].key;
    for (const s of stops) {
      const d = Math.abs(s.frac - view.frac);
      if (d < best) {
        best = d;
        key = s.key;
      }
    }
    return key;
  }, [stops, view.frac, navKey]);

  useEffect(() => {
    let alive = true;
    buildLeaves().then((l) => alive && setLeaves(l));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!leaves) return;
    let queued = false;
    const apply = () => {
      queued = false;
      // During a flip-to-cover OR a nav page-flip, the book is driven manually —
      // ignore all scroll so jumps/animations can't be fought by the scroll pipeline.
      if (flipping.current || navigating.current) return;
      // One scrollHeight read per frame (the vh spacer resizes with the
      // timeline, so this can't be cached across measurements).
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const tl = tlRef.current;
      const pos = max > 0 ? (window.scrollY / max) * tl.total : 0;
      const f = frameAt(pos, tl);
      // refs drive the 3D book via useFrame — cheap, no React work
      progress.current = f.pv;
      reveal.current = f.reveal;
      move.current = f.move;
      // Only re-render when something visible actually changed. Within a hold,
      // or between frames that round to the same values, React bails entirely.
      setView((prev) =>
        prev.section === f.section &&
        prev.move === f.move &&
        Math.abs(prev.opacity - f.reveal) < 0.004 &&
        Math.abs(prev.frac - f.descend) < 0.004 &&
        Math.abs(prev.read - f.read) < 0.004
          ? prev
          : { section: f.section, opacity: f.reveal, move: f.move, frac: f.descend, read: f.read },
      );
      setAtTop(window.scrollY < 40);
      // Show the "flip to cover" button as soon as the closing turn has brought the
      // back cover into frame (pv → max), not only at the very bottom of scroll.
      // Max pv is CHAPTERS.length + 1 (the closed back cover); 0.8 into the final
      // turn the cover has mostly settled and reads as "the last page in frame".
      // Only once the back cover has SETTLED (closing turn finished, pv≈max), not
      // mid-turn — during a turn the camera is zoomed out, and flipping from that
      // unsettled state lands the book cornered. The tail "hold" still spans ~a
      // screen-height, so the button appears well before the very bottom.
      setAtEnd(f.pv >= CHAPTERS.length + 0.99);
      // wake the demand-mode canvas so the book follows + settles after scroll
      wakeRef.current = performance.now() + 900;
      invalidate();
    };

    applyRef.current = apply;

    // Coalesce the native scroll firehose (100+/sec) down to one update per frame.
    let idleTimer = 0;
    const onScroll = () => {
      // flag "scrolling" (setState bails if already true → no per-frame churn),
      // then clear it ~200ms after the last scroll event.
      setScrolling((s) => (s ? s : true));
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setScrolling(false), 200);
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idleTimer);
    };
  }, [leaves]);

  // When a measurement changes the timeline (and thus the vh spacer height), the
  // same scrollY now maps to a new position — re-sync the view once after commit.
  useEffect(() => {
    applyRef.current();
  }, [timeline]);

  // Resize refits the camera over several damped frames — keep the loop awake.
  useEffect(() => {
    const onResize = () => {
      wakeRef.current = performance.now() + 900;
      invalidate();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure how far the current section's content overflows its viewport, so
  // the page scroll can pan through ALL of it (no separate inner scrollbar).
  useEffect(() => {
    const section = view.section;
    const measure = () => {
      const el = innerRef.current;
      if (!el) return;
      const vp = window.innerHeight * VIEW_VH;
      const ovPx = Math.max(0, el.scrollHeight - vp);
      setOverflow(ovPx);
      // Feed this section's overflow (in vh) into its chapter read budget, so the
      // scroll length matches the content: pans 1:1 when it overflows, none when
      // it fits. Quantize a touch to avoid rebuilding the timeline on sub-px jitter.
      const ovVh = Math.round(((ovPx / window.innerHeight) * 100) * 2) / 2;
      setReadVh((prev) => (prev[section] === ovVh ? prev : { ...prev, [section]: ovVh }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [view.section, leaves]);

  // Settle a finished nav flip: pin the book to the target page, then sync the
  // scrollbar there with ZERO animation so future scrolling continues from this
  // page and apply() agrees with the pose (no riffle, no jump).
  const finishNav = (stop: Stop) => {
    cancelAnimationFrame(navRaf.current);
    progress.current = stop.pv;
    reveal.current = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: stop.frac * max, left: 0, behavior: "instant" as ScrollBehavior });
    navigating.current = false;
    wakeRef.current = performance.now() + 700; // let the leaves damp-settle onto the page
    setNavKey(null);
    applyRef.current();
  };

  // True page-by-page flip to a nav stop: pin the scroll, tween the book's page
  // value (`progress`) through the leaves with the real turn curve, fading any
  // content cards out, decelerate onto the target spread, then sync the scrollbar.
  const flipToPage = (stop: Stop) => {
    if (!leaves) return;
    cancelAnimationFrame(navRaf.current);
    flipping.current = false;
    navigating.current = true;
    snap.current = false;
    setNavKey(stop.key);
    setView((v) => ({ ...v, opacity: 0 })); // drop the content cards immediately

    const startPv = progress.current;
    const startReveal = reveal.current;
    const dist = Math.abs(stop.pv - startPv);
    if (dist < 0.01 && startReveal < 0.01) {
      finishNav(stop);
      return;
    }

    // pace scales with how many pages we travel: a quick single flip, a longer
    // riffle for cover→back, both eased so they decelerate onto the page.
    const dur = THREE.MathUtils.clamp(360 + dist * 320, 460, 2000);
    const t0 = performance.now();
    const step = (now: number) => {
      const e = THREE.MathUtils.clamp((now - t0) / dur, 0, 1);
      progress.current = THREE.MathUtils.lerp(startPv, stop.pv, easeInOutCubic(e));
      reveal.current = THREE.MathUtils.lerp(startReveal, 0, Math.min(1, e * 2.2));
      wakeRef.current = now + 250; // keep the demand loop awake through the flip
      invalidate();
      if (e < 1) navRaf.current = requestAnimationFrame(step);
      else finishNav(stop);
    };
    navRaf.current = requestAnimationFrame(step);
  };

  // Literally flip the whole closed book over to the front cover. The book is
  // PINNED to the cover pose for the entire flip (scroll handler is guarded, and
  // snap=true forces poses with no damping), so zero page-turn animation plays.
  const D = 380;
  const land = () => {
    // Jump scroll to the top with ZERO animation. `behavior: "instant"` forces a
    // non-smooth jump regardless of the global `scroll-behavior: smooth` — if the
    // scroll were allowed to animate, it would ramp down from the back cover
    // (~12k px) over a second+, outlive the flip's `flipping` guard, and let the
    // scroll handler riffle `progress` 5→0 through every page turn. That replay
    // was the "goes through all animations at super speed" bug.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    // pin the book/camera to the closed cover pose
    progress.current = 0;
    reveal.current = 0;
    snap.current = true;
    invalidate();
  };
  const flipToCover = () => {
    const el = flipWrapRef.current;
    flipping.current = true; // freeze the scroll->book pipeline for the whole flip
    if (!el) {
      land();
      flipping.current = false;
      snap.current = false;
      return;
    }
    // On mobile the rotateY flip makes R3F re-measure the canvas mid-rotation as a
    // squished sliver (a viewport resize landing during the rotation), which threw
    // the book off to the side. Skip the 3D rotation on phones: cross-fade the book
    // out, snap to the cover while it's invisible, fade back in. No transform → no
    // squish, and snap=true keeps the pages from riffling.
    if (IS_MOBILE) {
      el.style.transition = "opacity 200ms ease";
      el.style.opacity = "0";
      window.setTimeout(() => {
        land();
        el.style.opacity = "1";
        window.setTimeout(() => {
          flipping.current = false;
          snap.current = false;
          applyRef.current();
        }, 240);
      }, 200);
      return;
    }
    const ease = "cubic-bezier(.45,0,.25,1)";
    el.style.transition = `transform ${D}ms ${ease}`;
    el.style.transform = "rotateY(90deg)";
    window.setTimeout(() => {
      land(); // swap to the cover while edge-on (invisible)
      el.style.transition = "none";
      el.style.transform = "rotateY(-90deg)";
      void el.offsetWidth; // reflow so the next transition runs
      el.style.transition = `transform ${D}ms ${ease}`;
      el.style.transform = "rotateY(0deg)";
      window.setTimeout(() => {
        flipping.current = false;
        snap.current = false;
        applyRef.current(); // resync now that the flip is done (guard is off)
      }, D + 60);
    }, D);
  };

  return (
    <>
      <BrandMark onHome={() => flipToPage(stops[0])} />
      <ContentsNav stops={stops} activeKey={activeKey} onGo={flipToPage} />

      <div className="fixed inset-0 overflow-hidden" style={{ perspective: "1800px" }}>
        <CinematicBackground frac={Math.round(view.frac * 60) / 60} />

        <div ref={flipWrapRef} style={FLIP_WRAP_STYLE}>
          <Canvas
            flat
            frameloop="demand"
            // Re-measure the canvas ONLY via ResizeObserver (immune to CSS
            // transforms), never on scroll. The flip rotates this canvas's wrapper,
            // and a scroll-triggered getBoundingClientRect mid-rotation reports a
            // near-zero width — which blew up the camera aspect and threw the book
            // tiny into a corner. ResizeObserver still catches real window resizes.
            resize={{ scroll: false }}
            // DPR 1 was too soft on retina phones (text rendered blurry). 1.5 is
            // sharp enough while the other mobile cuts (no MSAA, thin grain, lighter
            // shadow) keep it smooth. MSAA still off on mobile.
            dpr={IS_MOBILE ? 1.5 : [1, 1.5]}
            gl={{ antialias: !IS_MOBILE, alpha: true }}
            camera={{ fov: 42, position: [1, 0, 6] }}
            style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 26px 46px rgba(74,16,34,0.32))" }}
          >
            <RenderGovernor wake={wakeRef} />
            <CameraRig progress={progress} reveal={reveal} move={move} snap={snap} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[-2, 4, 6]} intensity={0.5} />
            <directionalLight position={[3, 2, 2]} intensity={0.2} />
            {/* tight, bright key for the glossy clearcoat sheen */}
            <pointLight position={[1.6, 2.2, 3.2]} intensity={26} distance={14} decay={2} color="#fff6ef" />
            <Suspense fallback={null}>{leaves && <BookRig leaves={leaves} progress={progress} reveal={reveal} move={move} snap={snap} />}</Suspense>
          </Canvas>
        </div>

        {/* Interactive content for the current chapter — rises into the center as the page exits */}
        {leaves && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              zIndex: 20,
              // on mobile, nudge the whole content column down so its top elements
              // (e.g. the contact page's social buttons) clear the fixed Contents pill
              padding: isMobile ? "72px 6vw 0" : "0 6vw",
              perspective: "1200px",
              pointerEvents: view.opacity > 0.5 ? "auto" : "none",
            }}
          >
            <div style={{ ...panelEntry(view.move, view.opacity), transition: "transform 0.12s linear, opacity 0.12s linear", width: "100%", display: "flex", justifyContent: "center" }}>
              {/* window is wider than the cards + has inner padding so card
                  shadows have room to fall instead of being clipped flush */}
              <div style={{ width: "min(44rem, 96%)", height: `${VIEW_VH * 100}vh`, overflow: "hidden" }}>
                <div ref={innerRef} style={{ transform: `translateY(${-view.read * overflow}px)`, willChange: "transform", padding: "26px 28px" }}>
                  <ContentPanel section={view.section} t={view.opacity} live={!scrolling} />
                </div>
              </div>
            </div>
          </div>
        )}

        {!leaves && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
            <p className="font-display text-lg italic text-[#6b6660]">preparing the issue…</p>
          </div>
        )}

        {leaves && atTop && (
          <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center" style={{ zIndex: 20 }}>
            <span className="animate-pulse text-xs uppercase tracking-[0.3em] text-[#15130f]">scroll to begin ↓</span>
          </div>
        )}

        {leaves && atEnd && (
          <div className="absolute inset-x-0 bottom-9 flex justify-center" style={{ zIndex: 60 }}>
            <button
              onClick={flipToCover}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#fff",
                background: "linear-gradient(105deg,#bb2350,#6e1226)",
                border: "none",
                borderRadius: 999,
                padding: "14px 28px",
                cursor: "pointer",
                boxShadow: "0 18px 34px -12px rgba(110,18,38,0.6)",
              }}
            >
              ↺ read it again
            </button>
          </div>
        )}
      </div>

      <div aria-hidden style={{ height: `${timeline.total}vh` }} />
    </>
  );
}
