import * as THREE from "three";

const PW = 1080;
const PH = 1440;

const PAPER = "#f7f3ec";
const PAPER_HI = "#fffdf9";
const PAPER_LO = "#efe8dd";
const INK = "#15130f";
const SOFT = "#5f5a52";
const FAINT = "#9a9389";
const RULE = "#cfc6b8";
const ACCENT = "#9a1b3a"; // deep magenta-red — matches the HTML panels
const ACCENT_DEEP = "#6e1226";

const M = 88;
const Mg = 110;

export type Leaf = { front: THREE.Texture; back: THREE.Texture };

async function ensureFonts(): Promise<void> {
  const probes = [
    "900 250px 'Playfair Display'",
    "800 92px 'Playfair Display'",
    "800 150px 'Playfair Display'",
    "600 40px 'Playfair Display'",
    "italic 600 80px 'Playfair Display'",
    "italic 600 40px 'Playfair Display'",
    "italic 500 50px 'Playfair Display'",
    "400 31px 'EB Garamond'",
    "500 31px 'EB Garamond'",
    "italic 400 31px 'EB Garamond'",
    "500 18px 'Montserrat'",
    "600 22px 'Montserrat'",
    "700 24px 'Montserrat'",
    "600 60px 'Dancing Script'",
    "700 60px 'Dancing Script'",
  ];
  try {
    await Promise.all(probes.map((p) => document.fonts.load(p)));
    await document.fonts.ready;
  } catch {
    /* empty */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Soft tonal washes for the base stock — runs UNDER the content. (Some pages
// repaint their own background, so the visible grain comes from bakePaperGrain.)
function bakePaperWash(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * PW;
    const y = Math.random() * PH;
    const r = 320 + Math.random() * 520;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() > 0.5 ? "rgba(120,92,60,0.05)" : "rgba(92,100,120,0.045)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
  }
}

// Paper fiber + corner foxing, applied OVER the finished page with a soft-light
// blend so it textures every page (even ones that paint their own background)
// while staying gentle on the type. Baked once → zero runtime cost.
function bakePaperGrain(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.lineWidth = 1;
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * PW;
    const y = Math.random() * PH;
    const len = 2 + Math.random() * 9;
    const a = Math.random() * Math.PI;
    ctx.strokeStyle =
      Math.random() > 0.5
        ? `rgba(36,28,18,${(0.18 + Math.random() * 0.28).toFixed(3)})`
        : `rgba(255,252,244,${(0.22 + Math.random() * 0.32).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
  // faint warm foxing in the corners for a printed, aged feel
  for (const [cx, cy] of [[0, 0], [PW, 0], [0, PH], [PW, PH]] as const) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 560);
    g.addColorStop(0, "rgba(150,120,80,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
  }
}

function makeTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = PW;
  canvas.height = PH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PW, PH);
  bakePaperWash(ctx);
  draw(ctx);
  bakePaperGrain(ctx); // fiber over everything, so section pages get it too
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function setTracking(ctx: CanvasRenderingContext2D, px: number): void {
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch {
    /* empty */
  }
}
function clearTracking(ctx: CanvasRenderingContext2D): void {
  setTracking(ctx, 0);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
  }
  return y;
}

function rule(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y: number,
  x1: number,
  color = RULE,
  width = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

function drawSpine(ctx: CanvasRenderingContext2D, side: "left" | "right"): void {
  const shadowW = 24;
  const gutterW = 60; // a wider, darker binding shadow so the book reads as bound
  if (side === "left") {
    // deep gutter valley (wine-toned) fading inward — the bound-edge shadow
    const dg = ctx.createLinearGradient(0, 0, gutterW, 0);
    dg.addColorStop(0, "rgba(74,16,34,0.32)");
    dg.addColorStop(0.5, "rgba(74,16,34,0.08)");
    dg.addColorStop(1, "rgba(74,16,34,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, gutterW, PH);
    const g = ctx.createLinearGradient(0, 0, shadowW, 0);
    g.addColorStop(0, PAPER_LO);
    g.addColorStop(1, "rgba(239,232,221,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, shadowW, PH);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(1, PH);
    ctx.stroke();
  } else {
    const dg = ctx.createLinearGradient(PW, 0, PW - gutterW, 0);
    dg.addColorStop(0, "rgba(74,16,34,0.32)");
    dg.addColorStop(0.5, "rgba(74,16,34,0.08)");
    dg.addColorStop(1, "rgba(74,16,34,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(PW - gutterW, 0, gutterW, PH);
    const g = ctx.createLinearGradient(PW, 0, PW - shadowW, 0);
    g.addColorStop(0, PAPER_LO);
    g.addColorStop(1, "rgba(239,232,221,0)");
    ctx.fillStyle = g;
    ctx.fillRect(PW - shadowW, 0, shadowW, PH);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PW - 1, 0);
    ctx.lineTo(PW - 1, PH);
    ctx.stroke();
  }
}

function drawFolio(
  ctx: CanvasRenderingContext2D,
  pageNo: string,
  side: "left" | "right",
): void {
  ctx.fillStyle = SOFT;
  ctx.font = "500 20px 'Montserrat'";
  setTracking(ctx, 2);
  if (side === "left") {
    ctx.textAlign = "left";
    ctx.fillText(pageNo, M, PH - 50);
    ctx.textAlign = "right";
    ctx.fillText("SIYONA MISTRY", PW - Mg, PH - 50);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(pageNo, PW - M, PH - 50);
    ctx.textAlign = "left";
    ctx.fillText("SIYONA MISTRY", Mg, PH - 50);
  }
  clearTracking(ctx);
}

function drawSectionNo(ctx: CanvasRenderingContext2D, x: number, n: string): void {
  ctx.textAlign = "left";
  ctx.fillStyle = ACCENT;
  ctx.font = "700 24px 'Montserrat'";
  setTracking(ctx, 2);
  ctx.fillText(`Nº ${n}`, x, 120);
  clearTracking(ctx);
}

function drawKicker(
  ctx: CanvasRenderingContext2D,
  x: number,
  text: string,
  ruleX0: number,
  ruleX1: number,
): void {
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "600 22px 'Montserrat'";
  setTracking(ctx, 4);
  ctx.fillText(text.toUpperCase(), x, 156);
  clearTracking(ctx);
  rule(ctx, ruleX0, 176, ruleX1);
}

function drawDropCap(
  ctx: CanvasRenderingContext2D,
  letter: string,
  x: number,
  baseline: number,
): number {
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "800 150px 'Playfair Display'";
  ctx.fillText(letter, x, baseline);
  const w = ctx.measureText(letter).width;
  return x + w + 18;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Soft edge darkening so the paper reads rich and lit, not flat.
function vignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(PW / 2, PH * 0.42, PH * 0.2, PW / 2, PH / 2, PH * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(72,40,30,0.06)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
}

// Diagonal sheen baked into the art to reinforce the 3D clearcoat gloss.
function glossSheen(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, PW, PH);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.42, "rgba(255,255,255,0.05)");
  g.addColorStop(0.5, "rgba(255,255,255,0.16)");
  g.addColorStop(0.58, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
}

// Huge faint numeral behind a heading — editorial drama.
function ghostNumeral(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: "left" | "right"): void {
  ctx.save();
  ctx.textAlign = align;
  ctx.fillStyle = ACCENT;
  ctx.globalAlpha = 0.07;
  ctx.font = "900 380px 'Playfair Display'";
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Deep magenta-red filled block with cream italic text — a reverse pull-quote.
function reverseQuote(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number): number {
  ctx.save();
  const lineH = 58;
  ctx.font = "italic 600 44px 'Playfair Display'";
  // measure wrapped lines
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  const innerW = w - 96;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > innerW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  const padY = 44;
  const h = padY * 2 + lines.length * lineH;
  // block + shadow
  ctx.shadowColor = "rgba(110,18,38,0.28)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_DEEP);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.shadowColor = "transparent";
  // big quote mark
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font = "900 150px 'Playfair Display'";
  ctx.textAlign = "left";
  ctx.fillText("“", x + 28, y + 110);
  // text
  ctx.fillStyle = "#fbeef0";
  ctx.font = "italic 600 44px 'Playfair Display'";
  ctx.textAlign = "left";
  let yy = y + padY + 44;
  for (const l of lines) {
    ctx.fillText(l, x + 48, yy);
    yy += lineH;
  }
  ctx.restore();
  return y + h;
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const ir = img.width / img.height;
  const r = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Natural-color cut-out figure standing on a magenta editorial panel.
function framedCutout(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, caption: string): void {
  ctx.save();
  ctx.shadowColor = "rgba(110,18,38,0.32)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, x, y, w, h, 12);
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "#cdc3b4"); // warm greige, matched to the cover top
  bg.addColorStop(1, "#9a8c7d"); // deeper greige
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();
  if (img) {
    // fill the panel width, anchor the head to the top; the transparent areas
    // reveal the greige panel behind her. Natural color, no duotone. A soft shadow
    // off her silhouette lifts her off the panel for depth.
    const scale = w / img.width;
    const dw = w;
    const dh = img.height * scale;
    // darker halo shadow so the light blush jacket separates from the greige panel;
    // two passes build a deeper, wrapping silhouette shadow
    ctx.save();
    ctx.shadowColor = "rgba(18,10,6,0.72)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.shadowColor = "rgba(18,10,6,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = -7;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
  }
  ctx.restore();

  // caption tag
  ctx.fillStyle = ACCENT;
  ctx.fillRect(x, y + h, 150, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "600 16px 'Montserrat'";
  ctx.textAlign = "left";
  setTracking(ctx, 2);
  ctx.fillText(caption.toUpperCase(), x + 14, y + h + 26);
  clearTracking(ctx);

  ctx.strokeStyle = "rgba(110,18,38,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

// Places a natural cut-out figure onto the page paper with a soft drop shadow,
// centered at cx, its feet at baseY, scaled to targetH.
function pageCutout(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, baseY: number, targetH: number, mirror = false): void {
  if (!img) return;
  const dw = (img.width * targetH) / img.height;
  const dy = baseY - targetH;
  ctx.save();
  ctx.shadowColor = "rgba(40,10,20,0.3)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = -9;
  ctx.shadowOffsetY = 15;
  if (mirror) {
    ctx.translate(cx, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, 0, dw, targetH);
  } else {
    ctx.drawImage(img, cx - dw / 2, dy, dw, targetH);
  }
  ctx.restore();
}

// A faux browser window framing one of the live sites.
function browserCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, url: string): void {
  ctx.save();
  ctx.shadowColor = "rgba(110,18,38,0.22)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 16);
  ctx.clip();
  // title bar
  ctx.fillStyle = "#f3eae6";
  ctx.fillRect(x, y, w, 50);
  const dots = ["#e0768a", "#e6c07a", "#9fd0a0"];
  dots.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 28 + i * 28, y + 25, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#fff";
  roundRect(ctx, x + 116, y + 13, w - 150, 24, 12);
  ctx.fill();
  ctx.fillStyle = SOFT;
  ctx.font = "500 16px 'Montserrat'";
  ctx.textAlign = "left";
  ctx.fillText(url, x + 132, y + 30);
  // accent hero band
  const bandH = 92;
  const bg = ctx.createLinearGradient(x, y + 50, x + w, y + 50 + bandH);
  bg.addColorStop(0, ACCENT);
  bg.addColorStop(1, ACCENT_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y + 50, w, bandH);
  ctx.fillStyle = "#fff";
  ctx.font = "800 38px 'Playfair Display'";
  ctx.fillText(title, x + 26, y + 50 + 60);
  // faux content lines
  ctx.fillStyle = "#e9e0d3";
  const ly = y + 50 + bandH + 28;
  for (let i = 0; i < 4; i++) {
    const lw = (w - 52) * (i % 2 ? 0.55 : 0.82);
    roundRect(ctx, x + 26, ly + i * 26, lw, 11, 5);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(110,18,38,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
}

function drawCover(ctx: CanvasRenderingContext2D, portrait: HTMLImageElement | null) {
  const g = ctx.createRadialGradient(
    PW * 0.5,
    PH * 0.4,
    PH * 0.1,
    PW * 0.5,
    PH * 0.5,
    PH * 0.85,
  );
  g.addColorStop(0, PAPER_HI);
  g.addColorStop(1, PAPER_LO);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);

  ctx.textAlign = "left";
  ctx.fillStyle = SOFT;
  ctx.font = "600 22px 'Montserrat'";
  setTracking(ctx, 3);
  ctx.fillText("PORTFOLIO · ISSUE Nº 01", 70, 64);
  ctx.textAlign = "right";
  ctx.fillStyle = ACCENT;
  ctx.fillText("JUNE 2026", PW - 70, 64);
  clearTracking(ctx);

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "900 250px 'Playfair Display'";
  ctx.fillText("SIYONA", PW / 2, 250);

  // top-right corner accent: vertical magenta line at the right margin (mirrors
  // the bottom-left corner). Drawn AFTER the masthead, and pinned to PW-70 so it
  // clears both the masthead letters and the magenta date.
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PW - 48, 48);
  ctx.lineTo(PW - 48, 78);
  ctx.stroke();

  if (portrait) {
    const iw = portrait.width;
    const ih = portrait.height;
    const targetH = PH * 0.9;
    const scale = targetH / ih;
    const dw = iw * scale;
    const dh = ih * scale;
    const cx = PW / 2; // centered
    const dx = cx - dw / 2;
    const dy = PH - dh + 26; // raised so her head crosses the SIYONA masthead
    // soft grounding shadow at the figure's base
    ctx.save();
    const sg = ctx.createRadialGradient(cx, PH - 26, 10, cx, PH - 26, dw * 0.42);
    sg.addColorStop(0, "rgba(21,19,15,0.4)");
    sg.addColorStop(1, "rgba(21,19,15,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, PH - 170, PW, 170);
    ctx.restore();
    ctx.drawImage(portrait, dx, dy, dw, dh);
  }

  // Crisp white outline behind the dark cover lines (low blur) so the type stays
  // legible where it crosses her hair while reading cleanly on the cream paper.
  // Thin white outline behind the dark cover lines so the (now bolder) type
  // stays legible where it crosses her hair, and clean on the cream paper.
  ctx.save();
  ctx.strokeStyle = "#fffdf9";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,253,249,0.6)";
  ctx.shadowBlur = 2;
  const out = (text: string, x: number, y: number) => {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  // Small fine-print sits on a crisp cream plate instead of an outline (which
  // blobs at small sizes). align matches the text's current textAlign.
  const plated = (text: string, x: number, y: number, align: "left" | "right") => {
    const tw = ctx.measureText(text).width;
    const padX = 13;
    const rx = (align === "right" ? x - tw : x) - padX;
    ctx.save();
    ctx.shadowColor = "rgba(74,16,34,0.22)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, rx, y - 30, tw + padX * 2, 42, 7);
    ctx.fillStyle = "rgba(255,253,249,0.95)";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  ctx.textAlign = "left";
  ctx.fillStyle = ACCENT; // magenta headline
  ctx.font = "italic 600 54px 'Playfair Display'";
  out("The Engineer Issue", 70, 768);

  ctx.fillStyle = INK;
  ctx.font = "700 26px 'Montserrat'";
  setTracking(ctx, 3);
  out("SOFTWARE ENGINEER", 70, 826);
  clearTracking(ctx);
  ctx.font = "500 29px 'EB Garamond'";
  plated("Full-stack · React · FastAPI · Python", 70, 864, "left");

  // right column staggered a little lower than the left
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = "700 26px 'Montserrat'";
  setTracking(ctx, 3);
  out("PROJECTS INSIDE", PW - 70, 1052);
  clearTracking(ctx);
  ctx.font = "500 29px 'EB Garamond'";
  plated("PJ Gas · Krown Connect", PW - 70, 1090, "right");
  plated("M.S. Computer Science · Georgia Tech", PW - 70, 1128, "right");
  ctx.restore();

  rule(ctx, 70, PH - 60, 190, ACCENT, 2);
  // bottom-left corner accent: vertical magenta line rising from the rule
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, PH - 60);
  ctx.lineTo(70, PH - 108);
  ctx.stroke();

  // (the "scroll" hint is the animated DOM overlay in Magazine.tsx — not baked
  // here, so it doesn't duplicate or clash with the figure bleeding off-bottom)

  vignette(ctx);
  glossSheen(ctx);
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  x: number,
  align: "left" | "right",
  title: string,
  accent?: { word: string; red: boolean },
): void {
  ctx.textAlign = align;
  ctx.fillStyle = INK;
  ctx.font = "800 92px 'Playfair Display'";
  ctx.fillText(title, x, 300);
  if (accent) {
    ctx.font = "italic 600 80px 'Playfair Display'";
    ctx.fillStyle = accent.red ? ACCENT : INK;
    ctx.fillText(accent.word, x, 392);
  }
}

function drawAbout(ctx: CanvasRenderingContext2D, portrait: HTMLImageElement | null) {
  drawSpine(ctx, "right");
  // (no ghost numeral on this page)
  drawKicker(ctx, M, "Profile", M, 560);
  drawHeadline(ctx, M, "left", "The", { word: "maker", red: true });

  // Natural-color cut-out portrait on a magenta panel, top-right.
  framedCutout(ctx, portrait, 632, 120, 338, 408, "the maker");

  const miniHead = (label: string, y: number): void => {
    ctx.textAlign = "left";
    ctx.fillStyle = ACCENT;
    ctx.font = "700 20px 'Montserrat'";
    setTracking(ctx, 3);
    ctx.fillText(label.toUpperCase(), M, y);
    clearTracking(ctx);
  };

  // Current role
  miniHead("Currently", 470);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "italic 600 46px 'Playfair Display'";
  ctx.fillText("SWE @ Krown Petroleum", M, 528);
  ctx.fillStyle = SOFT;
  ctx.font = "400 27px 'EB Garamond'";
  ctx.fillText("I fix messy workflows with clean software", M, 572);

  // Education
  miniHead("Education", 628);
  ctx.fillStyle = INK;
  ctx.font = "400 28px 'EB Garamond'";
  ctx.fillText("M.S. Computer Science (AI), Georgia Tech", M, 674);
  ctx.fillText("B.A. Computer Science, UAB · 4.0 GPA", M, 714);

  // Beyond the code
  miniHead("Beyond the code", 808);
  ctx.fillStyle = INK;
  ctx.font = "400 28px 'EB Garamond'";
  const iy = wrapText(
    ctx,
    "Anything creative keeps me going: from fashion to interior design to painting, dancing, and building websites just for the fun of it.",
    M,
    854,
    PW - M - M,
    40,
  );
  ctx.fillStyle = SOFT;
  ctx.font = "italic 400 27px 'EB Garamond'";
  const by = wrapText(ctx, "On the event-planning committee of Birmingham Women in Tech.", M, iy + 56, PW - M - M, 40);

  // bold closing statement on the reverse-color magenta block
  reverseQuote(ctx, "Time is money. I'll save you time so you can make more money. Hit me up ;)", M, by + 64, PW - M - M);

  drawFolio(ctx, "02", "left");
  vignette(ctx);
  glossSheen(ctx);
}

function drawWrappedAroundCap(
  ctx: CanvasRenderingContext2D,
  text: string,
  capX: number,
  fullX: number,
  rightX: number,
  startY: number,
  lineH: number,
  capLines: number,
): number {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  let lineIdx = 0;
  for (const w of words) {
    const x = lineIdx < capLines ? capX : fullX;
    const maxW = rightX - x;
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineH;
      lineIdx++;
    } else {
      line = test;
    }
  }
  if (line) {
    const x = lineIdx < capLines ? capX : fullX;
    ctx.fillText(line, x, y);
  }
  return y;
}

function drawProjects(ctx: CanvasRenderingContext2D, fig: HTMLImageElement | null) {
  drawSpine(ctx, "left");
  ghostNumeral(ctx, "02", Mg, 470, "left");

  // entries live in a wide right-hand column; the figure tucks into the lower-left
  const colX = 360;
  const colR = PW - M;

  // kicker + headline align to the projects column
  drawKicker(ctx, colX, "Selected projects", colX, colR);
  drawHeadline(ctx, colX, "left", "The", { word: "works", red: true });

  const entry = (no: string, title: string, url: string, body: string, y: number, divider: boolean) => {
    ctx.textAlign = "left";
    ctx.fillStyle = ACCENT;
    ctx.font = "700 22px 'Montserrat'";
    setTracking(ctx, 2);
    ctx.fillText(no, colX, y);
    clearTracking(ctx);
    ctx.fillStyle = INK;
    ctx.font = "italic 600 35px 'Playfair Display'";
    ctx.fillText(title, colX + 52, y + 2);
    ctx.fillStyle = ACCENT;
    ctx.font = "500 17px 'Montserrat'";
    setTracking(ctx, 1);
    ctx.fillText(url, colX + 52, y + 32);
    clearTracking(ctx);
    ctx.fillStyle = INK; // darker + bigger so the descriptions read clearly
    ctx.font = "400 27px 'EB Garamond'";
    wrapText(ctx, body, colX, y + 76, colR - colX, 36);
    if (divider) rule(ctx, colX, y + 168, colR);
  };

  entry(
    "01",
    "PJ Gas",
    "pjgas.com",
    "Customer-facing site for live gas prices, deals, and store info. Mobile-friendly and SEO-focused.",
    446,
    true,
  );
  entry(
    "02",
    "Krown Connect",
    "krownconnect.com",
    "Production platform I built for cross-team use at Krown Petroleum. Cut inventory tracking time by 80%.",
    652,
    true,
  );
  entry(
    "03",
    "Chemical Inventory",
    "github.com/siya-mistry/cs499",
    "Full-stack lab inventory app with an iOS frontend and Flask backend, plus auth, barcode generation, and REST APIs.",
    858,
    true,
  );
  entry(
    "04",
    "This Portfolio",
    "github.com/siya-mistry",
    "A React and TypeScript site rendered as a 3D, flippable magazine, with a serverless Go contact API.",
    1064,
    false,
  );

  drawFolio(ctx, "03", "right");
  vignette(ctx);
  glossSheen(ctx);

  // smaller figure tucked in the lower-left, drawn LAST so the gloss sheen never streaks it
  pageCutout(ctx, fig, 172, PH - 96, 470);
}

function drawExperience(ctx: CanvasRenderingContext2D, fig: HTMLImageElement | null, sig: HTMLImageElement | null = null) {
  drawSpine(ctx, "right");
  ghostNumeral(ctx, "03", PW - Mg, 470, "right");
  drawSectionNo(ctx, M, "03");
  drawKicker(ctx, M, "On the record", M, PW - Mg);

  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "800 92px 'Playfair Display'";
  ctx.fillText("Experience", M, 300);

  const colR = PW - Mg;
  const lineX = M + 9;
  const textX = M + 56;
  const ys = [360, 484, 608, 732];
  // timeline spine
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineX, ys[0] - 26);
  ctx.lineTo(lineX, ys[ys.length - 1] + 14);
  ctx.stroke();

  const entry = (role: string, period: string, body: string, y: number) => {
    // node dot
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(lineX, y - 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(lineX, y - 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = "600 23px 'Montserrat'";
    setTracking(ctx, 1);
    ctx.fillText(role.toUpperCase(), textX, y);
    clearTracking(ctx);
    ctx.textAlign = "right";
    ctx.fillStyle = ACCENT;
    ctx.font = "600 17px 'Montserrat'";
    ctx.fillText(period, colR, y);
    ctx.textAlign = "left";
    ctx.fillStyle = SOFT;
    ctx.font = "400 27px 'EB Garamond'";
    wrapText(ctx, body, textX, y + 44, colR - textX, 38);
  };

  entry(
    "Software Engineer, Krown Petroleum",
    "FEB 2026 – NOW",
    "Develop fuel technology products for the convenience industry and own Krown Connect, a platform for cross-team use.",
    ys[0],
  );
  entry(
    "SWE Intern, Guidewire",
    "2025",
    "Built cloud-native infrastructure and backend tooling in Go on AWS and Kubernetes.",
    ys[1],
  );
  entry(
    "CS Teaching Assistant, UAB",
    "2024",
    "Mentored students through core CS coursework in office hours and labs; graded work and guided debugging.",
    ys[2],
  );
  entry(
    "Data Intern, Black Warrior Riverkeeper",
    "2022 – 23",
    "Python scripts to extract and organize data from 300+ environmental reports.",
    ys[3],
  );

  // small handwritten margin note in the open lower-right, a casual aside (not a headline)
  ctx.save();
  ctx.translate(486, 1184);
  ctx.rotate(-0.05);
  ctx.textAlign = "left";
  ctx.font = "700 78px 'Dancing Script'";
  ctx.fillStyle = ACCENT;
  ctx.fillText("always learning", 0, 0);
  const noteW = ctx.measureText("always learning").width;
  // hand-drawn underline swoosh
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, 22);
  ctx.quadraticCurveTo(noteW * 0.5, 40, noteW - 4, 16);
  ctx.stroke();
  ctx.restore();

  // hand-drawn signature beneath the note, like a sign-off
  if (sig) {
    const sw = 212;
    const sh = (sig.height * sw) / sig.width;
    const sx = 560;
    const sy = 1236;
    // short hand-drawn dash in front, so it reads like "- Ssu"
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - 42, sy + sh * 0.52);
    ctx.lineTo(sx - 12, sy + sh * 0.52);
    ctx.stroke();
    ctx.drawImage(sig, sx, sy, sw, sh);
  }

  // figure placement, shared so the disc can be cut to match where the hand is cropped
  const figCx = 200;
  const figBaseY = 1444;
  const figH = 620;
  const figW = (1040 * figH) / 1600; // shot-2 cutout aspect (1040 x 1600)
  const handCutX = figCx + figW / 2; // the photo's right edge, where the hand is cropped

  // soft disc behind the figure, matched to the cover top's warm greige; head breaks
  // out the top, and its right side is cut flat at the hand line so the crop reads intentional
  const discX = 232;
  const discY = PH - 168;
  const discR = 332;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, handCutX, PH);
  ctx.clip();
  // same vertical light-to-dark sweep as the maker panel, so the two read identically
  const spot = ctx.createLinearGradient(discX, discY - discR, discX, discY + discR);
  spot.addColorStop(0, "#cdc3b4");
  spot.addColorStop(1, "#9a8c7d");
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.arc(discX, discY, discR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawFolio(ctx, "04", "left");
  vignette(ctx);
  glossSheen(ctx);

  // soft grounding shadow for the figure, baked straight into the page texture so it
  // costs nothing at runtime (the page is drawn to canvas once and used as a static GPU
  // texture). This extra pass casts a wider, deeper shadow than pageCutout's built-in one.
  if (fig) {
    ctx.save();
    ctx.shadowColor = "rgba(30,6,16,0.5)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetX = -10;
    ctx.shadowOffsetY = 26;
    ctx.drawImage(fig, figCx - figW / 2, figBaseY - figH, figW, figH);
    ctx.restore();
  }

  // big figure bled fully to the bottom edge; gloss never streaks it
  pageCutout(ctx, fig, figCx, figBaseY, figH);
}

function drawContact(ctx: CanvasRenderingContext2D, fig: HTMLImageElement | null) {
  drawSpine(ctx, "left");
  ghostNumeral(ctx, "04", Mg, 470, "left");
  // accent figure on the right, above the contact block. The 3D page material adds
  // the texture back as emissive on top of the lit diffuse, which blew out her face
  // here — knock this figure's exposure down (and nudge contrast) so it survives the
  // emissive boost and stays legible. Only the contact figure is dimmed.
  ctx.save();
  ctx.filter = "brightness(0.74) contrast(1.08)";
  pageCutout(ctx, fig, PW - 175, 700, 540);
  ctx.restore();
  drawKicker(ctx, Mg, "Get in touch", Mg, PW - M);
  drawHeadline(ctx, Mg, "left", "Let's", { word: "talk", red: true });

  const capRight = drawDropCap(ctx, "T", Mg, 540);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "400 31px 'EB Garamond'";
  drawWrappedAroundCap(
    ctx,
    "hat's the whole issue. The rest is off the record, over coffee. I'm always open to collaborations, cool new projects, freelance work, and good conversation.",
    capRight,
    Mg,
    756, // stop short of the figure on the right so text never crosses her dark dress
    480,
    46,
    3,
  );

  // Deep magenta-red contact block.
  const bx = Mg;
  const bw = PW - M - Mg;
  const by = 720;
  const bh = 466;
  ctx.save();
  ctx.shadowColor = "rgba(110,18,38,0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_DEEP);
  ctx.fillStyle = grad;
  roundRect(ctx, bx, by, bw, bh, 20);
  ctx.fill();
  ctx.restore();

  const rows: Array<[string, string]> = [
    ["EMAIL", "siyonamistry@gmail.com"],
    ["GATECH", "smistry48@gatech.edu"],
    ["GITHUB", "github.com/siya-mistry"],
    ["LINKEDIN", "linkedin.com/in/siyapmistry"],
    ["COFFEE", "calendly.com/siyonamistry/30min"],
  ];
  let y = by + 70;
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "600 18px 'Montserrat'";
    setTracking(ctx, 2);
    ctx.fillText(label, bx + 44, y);
    clearTracking(ctx);
    ctx.fillStyle = "#fdeef0";
    ctx.font = "400 30px 'EB Garamond'";
    ctx.fillText(value, bx + 200, y);
    y += 64;
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "italic 600 40px 'Playfair Display'";
  ctx.fillText("Siyona", bx + bw - 40, by + bh - 36);

  drawFolio(ctx, "05", "right");
  vignette(ctx);
  glossSheen(ctx);
}

function drawBackCover(ctx: CanvasRenderingContext2D, fig: HTMLImageElement | null) {
  const g = ctx.createRadialGradient(
    PW * 0.5,
    PH * 0.5,
    PH * 0.1,
    PW * 0.5,
    PH * 0.5,
    PH * 0.85,
  );
  g.addColorStop(0, PAPER_HI);
  g.addColorStop(1, PAPER_LO);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);

  // featured figure, centered with her feet at the bottom edge
  const figH = 1200;
  const figBaseY = PH - 8;
  // Grounding drop shadow — drawn ONCE here into the page texture (makeTexture runs
  // a single time at load), so it has zero per-frame cost and triggers no rerenders.
  // The image is redrawn opaque on top by pageCutout; only this shadow halo shows.
  if (fig) {
    const dw = (fig.width * figH) / fig.height;
    const dx = PW / 2 - dw / 2;
    const dy = figBaseY - figH;
    ctx.save();
    ctx.shadowColor = "rgba(22,6,12,0.78)";
    ctx.shadowBlur = 44;
    ctx.shadowOffsetX = -8;
    ctx.shadowOffsetY = 30;
    ctx.drawImage(fig, dx, dy, dw, figH);
    ctx.restore();
  }
  pageCutout(ctx, fig, PW / 2, figBaseY, figH);

  // wordmark sits in the clear band above her head (raised to keep clearance now
  // that the figure is larger)
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "900 104px 'Playfair Display'";
  ctx.fillText("SIYONA", PW / 2, 135);

  rule(ctx, PW / 2 - 90, 172, PW / 2 + 90, ACCENT, 2);

  ctx.fillStyle = SOFT;
  ctx.font = "italic 500 48px 'Playfair Display'";
  ctx.fillText("Fin", PW / 2, 212);

  vignette(ctx);
  glossSheen(ctx);
}

export async function buildLeaves(): Promise<Leaf[]> {
  await ensureFonts();
  const load = async (src: string) => {
    try {
      return await loadImage(src);
    } catch {
      return null;
    }
  };
  // Background-removed cut-outs sprinkled through the issue.
  const [coverShot, makerShot, projShot, contactShot, backShot, expFig, signature] = await Promise.all([
    load("/media/shots/shot-5.webp"), // cover
    load("/media/shots/shot-1.webp"), // about, "the maker"
    load("/media/shots/shot-8.webp"), // projects
    load("/media/shots/shot-7.webp"), // contact
    load("/media/shots/shot-6.webp"), // back cover
    load("/media/shots/shot-2.webp"), // experience, single figure lower-left
    load("/media/exp/signature.png"), // experience, handwritten signature
  ]);

  const cover = makeTexture((ctx) => drawCover(ctx, coverShot));
  const about = makeTexture((ctx) => drawAbout(ctx, makerShot));
  const projects = makeTexture((ctx) => drawProjects(ctx, projShot));
  const experience = makeTexture((ctx) => drawExperience(ctx, expFig, signature));
  const contact = makeTexture((ctx) => drawContact(ctx, contactShot));
  const backCover = makeTexture((ctx) => drawBackCover(ctx, backShot));

  return [
    { front: cover, back: about },
    { front: projects, back: experience },
    { front: contact, back: backCover },
  ];
}
