// Evolving, high-fashion editorial backdrop: drifting aurora blobs whose palette
// shifts as you descend through the issue, finished with fine film grain.
import { memo } from "react";

type Palette = { base: string; a: string; b: string; c: string };

// Color journey down the page (frac 0 → 1): ivory → dusty rose-wine →
// mauve-wine → champagne/terracotta → deep rose finale. Light and restrained,
// deep magenta-red (not pink) as the editorial through-line.
const STOPS: Array<{ at: number } & Palette> = [
  { at: 0.0, base: "#f5f0e8", a: "#f1dfe2", b: "#ece4dc", c: "#f3e6ea" },
  { at: 0.2, base: "#f3e9e9", a: "#eccdd4", b: "#e9dfe6", c: "#f0dde2" },
  { at: 0.42, base: "#efe6ec", a: "#e6c2cf", b: "#e2d6e2", c: "#eed6df" },
  { at: 0.66, base: "#f4ece0", a: "#eecfc8", b: "#ecdcd2", c: "#f3e2d6" },
  { at: 0.88, base: "#f1dee2", a: "#e3b4c2", b: "#eecfc6", c: "#ecccd6" },
  { at: 1.0, base: "#efd9de", a: "#dcaab9", b: "#ecc8c0", c: "#e8c4d0" },
];

function hexLerp(x: string, y: string, t: number): string {
  const a = parseInt(x.slice(1), 16);
  const b = parseInt(y.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

function paletteAt(frac: number): Palette {
  const f = Math.max(0, Math.min(1, frac));
  let i = 0;
  while (i < STOPS.length - 1 && f > STOPS[i + 1].at) i++;
  const lo = STOPS[i];
  const hi = STOPS[Math.min(i + 1, STOPS.length - 1)];
  const span = hi.at - lo.at || 1;
  const t = Math.max(0, Math.min(1, (f - lo.at) / span));
  return {
    base: hexLerp(lo.base, hi.base, t),
    a: hexLerp(lo.a, hi.a, t),
    b: hexLerp(lo.b, hi.b, t),
    c: hexLerp(lo.c, hi.c, t),
  };
}

const radial = (c: string) => `radial-gradient(circle at 50% 50%, ${c} 0%, transparent 68%)`;

// A tileable paper-fiber texture, generated ONCE into a data URL. Rendered as a
// plain static background image (no blend mode, no filter, no animation), so it
// composites for free every frame — the "image of paper behind everything".
let _paperUrl: string | null = null;
function paperTextureUrl(): string {
  if (_paperUrl) return _paperUrl;
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const len = 1 + Math.random() * 6;
    const a = Math.random() * Math.PI;
    ctx.strokeStyle =
      Math.random() > 0.5
        ? `rgba(74,38,50,${(0.07 + Math.random() * 0.1).toFixed(3)})`
        : `rgba(255,250,245,${(0.1 + Math.random() * 0.14).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  _paperUrl = cv.toDataURL();
  return _paperUrl;
}

function CinematicBackgroundImpl({ frac }: { frac: number }) {
  const p = paletteAt(frac);
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: p.base, transition: "background 0.6s linear" }}
    >
      <div
        className="cine-blob"
        style={{
          top: "-18%",
          left: "-12%",
          width: "75vw",
          height: "75vw",
          background: radial(p.a),
          opacity: 0.6,
          animation: "drift1 26s ease-in-out infinite",
        }}
      />
      <div
        className="cine-blob"
        style={{
          bottom: "-22%",
          right: "-14%",
          width: "80vw",
          height: "80vw",
          background: radial(p.b),
          opacity: 0.55,
          animation: "drift2 32s ease-in-out infinite",
        }}
      />
      <div
        className="cine-blob"
        style={{
          top: "20%",
          right: "8%",
          width: "55vw",
          height: "55vw",
          background: radial(p.c),
          opacity: 0.5,
          animation: "drift3 22s ease-in-out infinite",
        }}
      />
      {/* soft top-down light fall for editorial depth */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 35%, rgba(110,18,38,0.06) 100%)" }}
      />
      <div className="cine-grain" />
      {/* One static layer: center spotlight + edge vignette + paper-fiber tile.
          No blend mode / filter / animation → composites for free every frame. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 62% 56% at 50% 45%, rgba(255,252,248,0.55) 0%, transparent 58%), radial-gradient(ellipse 78% 82% at 50% 42%, transparent 56%, rgba(52,10,24,0.22) 100%), url(${paperTextureUrl()})`,
          backgroundSize: "cover, cover, 256px 256px",
          backgroundRepeat: "no-repeat, no-repeat, repeat",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// Memoized so it only rebuilds its blob DOM when the (quantized) palette frac
// actually steps — not on every scroll frame.
export default memo(CinematicBackgroundImpl);
