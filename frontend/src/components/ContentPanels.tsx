import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { site } from "../data/site";
import { projects } from "../data/projects";
import { experience } from "../data/experience";
import { education, languages, tools, priorTech, aboutBlurb } from "../data/about";

const INK = "#15130f";
const SOFT = "#5f5a52";
const RULE = "#d8cfc2";
const ACCENT = "#9a1b3a"; // deep magenta-red — the editorial through-line
const ACCENT_BRIGHT = "#bb2350";
const ACCENT_DEEP = "#6e1226";
const GRAD = `linear-gradient(105deg, ${ACCENT_BRIGHT}, ${ACCENT_DEEP})`;
const DISPLAY = "'Playfair Display', Georgia, serif";
const BODY = "'EB Garamond', Georgia, serif";
const SANS = "'Montserrat', system-ui, sans-serif";

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function smooth(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/* ----------------------------------------------------------------- */
/* Scroll-tied kinetic reveal — each piece eases up as `o` advances. */
/* ----------------------------------------------------------------- */
function Reveal({
  o,
  i = 0,
  step = 0.05,
  dur = 0.3,
  dy = 26,
  children,
  style,
}: {
  o: number;
  i?: number;
  step?: number;
  dur?: number;
  dy?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const e = smooth((o - i * step) / dur);
  return (
    <div style={{ ...style, transform: `translateY(${(1 - e) * dy}px)`, opacity: e, willChange: "transform, opacity" }}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Anti-gravity floating card — levitates + tilts in 3D toward cursor */
/* ----------------------------------------------------------------- */
function FloatCard({
  children,
  delay = 0,
  max = 7,
  still = false,
  style,
}: {
  children: ReactNode;
  delay?: number;
  max?: number;
  // `still` drops the perpetual levitation animation + layer promotion. Use it
  // for cards that contain a live <iframe>: an animated container forces the
  // browser to re-composite the whole external document every frame, forever.
  still?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(14px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "rotateY(0deg) rotateX(0deg) translateZ(0)";
  };
  return (
    <div className={still ? undefined : "float-wrap"} style={{ animationDelay: still ? undefined : `${delay}s`, ...style }}>
      <div ref={ref} className="tilt glass-card" onMouseMove={onMove} onMouseLeave={onLeave} style={{ padding: "1.4rem 1.5rem" }}>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Tilted polaroid + a scattered row of them — editorial scrapbook.   */
/* ----------------------------------------------------------------- */
function Polaroid({ src, caption, rotate = 0 }: { src: string; caption?: string; rotate?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fffdf9",
        padding: "12px 12px 0",
        borderRadius: 3,
        width: 188,
        cursor: "default",
        zIndex: hover ? 6 : 1,
        willChange: "transform",
        transform: hover
          ? "rotate(0deg) translateY(-10px) scale(1.05) translateZ(0)"
          : `rotate(${rotate}deg) translateZ(0)`,
        boxShadow: hover
          ? "0 18px 30px -16px rgba(74,16,34,0.45)"
          : "0 9px 16px -12px rgba(74,16,34,0.38)",
        transition: "transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease",
      }}
    >
      <img src={src} alt={caption ?? ""} loading="lazy" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
      {caption && (
        <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 16, color: INK, textAlign: "center", padding: "9px 4px 13px" }}>
          {caption}
        </div>
      )}
    </div>
  );
}

// Lazily loads Calendly's widget script (only when this mounts) and inits the
// inline scheduler programmatically, since the raw <script> embed won't auto-init in a SPA.
function CalendlyInline({ url, height = 660 }: { url: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const themed = `${url}?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=9a1b3a`;
    const init = () => {
      const C = (window as unknown as { Calendly?: { initInlineWidget: (o: { url: string; parentElement: HTMLElement }) => void } }).Calendly;
      if (!C || !el) return;
      el.innerHTML = ""; // guard against double-init (e.g. StrictMode)
      C.initInlineWidget({ url: themed, parentElement: el });
    };
    const id = "calendly-widget-js";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      init();
    } else {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.onload = init;
      document.body.appendChild(s);
    }
  }, [url]);
  // fluid width so it never exceeds the card on narrow phones; the global
  // .calendly-host override (index.css) also relaxes Calendly's own iframe min-width.
  return <div ref={ref} className="calendly-host" style={{ width: "100%", minWidth: 0, maxWidth: "100%", height, borderRadius: 14, overflow: "hidden" }} />;
}

function PolaroidRow({ items }: { items: Array<{ src: string; caption?: string }> }) {
  const rots = [-5, 4, -3, 5];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", margin: "8px 0 16px" }}>
      {items.map((p, i) => (
        <div key={p.src} style={{ marginLeft: i ? -14 : 0, marginTop: i % 2 ? 20 : 0 }}>
          <Polaroid src={p.src} caption={p.caption} rotate={rots[i % rots.length]} />
        </div>
      ))}
    </div>
  );
}

const wrap: CSSProperties = {
  width: "100%",
  color: INK,
  fontFamily: BODY,
  paddingBottom: "2rem",
};

const kicker: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: ACCENT,
};

const heading: CSSProperties = {
  fontFamily: DISPLAY,
  fontWeight: 800,
  fontSize: "clamp(2.6rem, 5vw, 4rem)",
  lineHeight: 1.0,
  margin: "0.3rem 0 1.6rem",
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// Giant ghost numeral sitting behind a heading.
function GhostNo({ n }: { n: string }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        right: "-0.3rem",
        top: "-2.6rem",
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: "9rem",
        lineHeight: 1,
        color: ACCENT,
        opacity: 0.08,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {n}
    </span>
  );
}

const link: CSSProperties = {
  color: INK,
  textDecoration: "none",
  borderBottom: `1.5px solid ${ACCENT}`,
};

function Chip({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: ACCENT_DEEP,
        background: "rgba(154,27,58,0.07)",
        border: `1px solid rgba(154,27,58,0.22)`,
        borderRadius: 999,
        padding: "6px 13px",
      }}
    >
      {children}
    </span>
  );
}

/* ============================= ABOUT ============================= */
function About({ o }: { o: number }) {
  return (
    <div style={wrap}>
      <div style={{ position: "relative" }}>
        <GhostNo n="01" />
        <Reveal o={o} i={0} style={kicker}>
          Profile
        </Reveal>
        <Reveal o={o} i={1}>
          <h2 style={heading}>About</h2>
        </Reveal>
      </div>
      <Reveal o={o} i={2}>
        <FloatCard delay={0}>
          <p style={{ fontSize: "1.3rem", lineHeight: 1.6, margin: 0 }}>{aboutBlurb}</p>
        </FloatCard>
      </Reveal>

      <Reveal o={o} i={4} style={{ ...kicker, color: SOFT, margin: "1.6rem 0 10px" }}>
        Skills
      </Reveal>
      <Reveal o={o} i={5}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[...languages, ...tools].map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
        <p style={{ fontSize: "0.95rem", color: SOFT, margin: "12px 0 1.4rem" }}>
          Used {priorTech.slice(0, -1).join(", ")}, and {priorTech[priorTech.length - 1]} in a past life. Give me a weekend and we're good ;)
        </p>
      </Reveal>

      <Reveal o={o} i={6} style={{ ...kicker, color: SOFT, marginBottom: 10 }}>
        Education
      </Reveal>
      <Reveal o={o} i={7}>
        <FloatCard delay={0.6}>
          {education.map((e, idx) => (
            <div key={e.degree} style={{ marginBottom: idx === education.length - 1 ? 0 : "0.9rem" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                {e.degree}, {e.school}
              </div>
              <div style={{ fontSize: "1rem", color: SOFT }}>{e.details.join(" · ")}</div>
            </div>
          ))}
        </FloatCard>
      </Reveal>
      <Reveal o={o} i={8}>
        <PolaroidRow
          items={[
            { src: "/media/exp/edu1.webp", caption: "Most Inspirational WIT, Dr. Wagner " },
            { src: "/media/exp/edu2.webp", caption: "study crew" },
            { src: "/media/exp/edu3.webp", caption: "blaze, signed off" },
          ]}
        />
      </Reveal>
    </div>
  );
}

/* ============================ PROJECTS =========================== */
// Live, scaled preview of an actual site inside faux browser chrome.
// Touch devices (phones/tablets) skip the live embed entirely — too costly to
// composite a full external site. They get the stand-in card, which opens the
// real site on tap.
function useTouchDevice(): boolean {
  const q = "(hover: none) and (pointer: coarse)";
  const [touch, setTouch] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const onChange = () => setTouch(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return touch;
}

// `live` is false while scrolling: the iframe stays mounted (no reload) but is
// hidden from compositing — the stand-in shows — so panning a live external site
// costs nothing; it reappears the instant you stop. Desktop only — touch devices
// skip this whole panel (see Projects) and just show the link.
function LivePreview({ url, live = true }: { url: string; live?: boolean }) {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <a href={url} target="_blank" rel="noreferrer" className="browser-chrome" style={{ display: "block", textDecoration: "none" }}>
      <div className="browser-bar">
        <span className="browser-dot" style={{ background: "#e9b7be" }} />
        <span className="browser-dot" style={{ background: "#ecd2a6" }} />
        <span className="browser-dot" style={{ background: "#bcd8b8" }} />
        <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 11, color: SOFT, letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {host} ↗
        </span>
      </div>
      <div style={{ position: "relative", height: 180, overflow: "hidden", background: "linear-gradient(135deg, #f7eef1, #ece0e4)" }}>
        <iframe
          src={url}
          title={host}
          loading="lazy"
          tabIndex={-1}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "200%",
            height: "200%",
            border: "none",
            transform: "scale(0.5)",
            transformOrigin: "top left",
            pointerEvents: "none",
            visibility: live ? "visible" : "hidden",
          }}
        />
        {!live && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT }}>live preview</span>
            <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 17, color: INK }}>{host}</span>
          </div>
        )}
        {/* click-catcher so the whole frame opens the live site */}
        <div style={{ position: "absolute", inset: 0 }} />
      </div>
    </a>
  );
}

function Projects({ o }: { o: number; live?: boolean }) {
  return (
    <div style={wrap}>
      <div style={{ position: "relative" }}>
        <GhostNo n="02" />
        <Reveal o={o} i={0} style={kicker}>
          Selected work
        </Reveal>
        <Reveal o={o} i={1}>
          <h2 style={heading}>Projects</h2>
        </Reveal>
      </div>

      {projects.map((p, idx) => {
        const url = p.link ?? p.repo;
        return (
          <Reveal key={p.title} o={o} i={2 + idx} style={{ marginBottom: "1.3rem" }}>
            <FloatCard delay={idx * 0.5}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, color: ACCENT }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: "1.7rem" }}>
                  {p.title}
                </span>
              </div>
              {url && (
                <a href={url} target="_blank" rel="noreferrer" style={{ ...link, fontFamily: SANS, fontSize: 13, display: "inline-block", margin: "4px 0" }}>
                  {url.replace(/^https?:\/\//, "")} ↗
                </a>
              )}
              <p style={{ fontSize: "1.08rem", color: INK, lineHeight: 1.5, margin: "4px 0 8px" }}>{p.blurb}</p>
              {p.details && (
                <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
                  {p.details.map((d) => (
                    <li key={d} style={{ display: "flex", gap: 10, fontSize: "1rem", color: SOFT, lineHeight: 1.5, marginBottom: 6 }}>
                      <span aria-hidden style={{ color: ACCENT, fontSize: "0.85rem", lineHeight: 1.75, flexShrink: 0 }}>
                        ✦
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.tech.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </FloatCard>
          </Reveal>
        );
      })}
    </div>
  );
}

/* =========================== EXPERIENCE ========================== */
function Experience({ o }: { o: number }) {
  return (
    <div style={wrap}>
      <div style={{ position: "relative" }}>
        <GhostNo n="03" />
        <Reveal o={o} i={0} style={kicker}>
          On the record
        </Reveal>
        <Reveal o={o} i={1}>
          <h2 style={heading}>Experience</h2>
        </Reveal>
      </div>

      {experience.map((e, idx) => (
        <Reveal key={e.role} o={o} i={2 + idx} style={{ marginBottom: "1.2rem" }}>
          <FloatCard delay={idx * 0.5}>
            {e.polaroids ? (
              <PolaroidRow items={e.polaroids} />
            ) : e.photo ? (
              <img
                src={e.photo}
                alt={e.org}
                loading="lazy"
                style={{ width: "100%", display: "block", borderRadius: 12, marginBottom: 14, border: "1px solid rgba(110,18,38,0.14)" }}
              />
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: "1.25rem", fontFamily: DISPLAY }}>{e.role}</span>
              <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: SOFT }}>{e.period}</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: ACCENT, margin: "3px 0 8px" }}>
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>
                  {e.org} ↗
                </a>
              ) : (
                e.org
              )}
            </div>
            <ul style={{ listStyle: "none", margin: "0 0 4px", padding: 0 }}>
              {e.details.map((d) => (
                <li key={d} style={{ display: "flex", gap: 10, fontSize: "1rem", color: SOFT, lineHeight: 1.5, marginBottom: 6 }}>
                  <span aria-hidden style={{ color: ACCENT, fontSize: "0.85rem", lineHeight: 1.75, flexShrink: 0 }}>
                    ✦
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </FloatCard>
        </Reveal>
      ))}
    </div>
  );
}

/* ============================ CONTACT ============================ */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.8 1.7 2.6 1.2 0-.5.2-1 .4-1.3-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2v3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function SocialButton({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 46,
        height: 46,
        borderRadius: 13,
        color: hover ? "#fff" : ACCENT,
        background: hover ? GRAD : "rgba(154,27,58,0.07)",
        border: `1px solid ${hover ? "transparent" : "rgba(154,27,58,0.22)"}`,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all .2s ease",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

function Contact({ o }: { o: number }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  const field: CSSProperties = {
    width: "100%",
    fontFamily: BODY,
    fontSize: "1.05rem",
    color: INK,
    background: "rgba(255,255,255,0.7)",
    border: `1px solid ${RULE}`,
    borderRadius: 10,
    padding: "11px 13px",
    marginBottom: 12,
    boxSizing: "border-box",
  };

  return (
    <div style={wrap}>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <GhostNo n="04" />
          <Reveal o={o} i={0} style={{ ...kicker, letterSpacing: "0.1em" }}>
            I hope I&rsquo;ve convinced you I&rsquo;m cool by now
          </Reveal>
          <Reveal o={o} i={1}>
            <h2 style={{ ...heading, margin: "0.3rem 0 0" }}>Let&rsquo;s keep in touch</h2>
          </Reveal>
        </div>
        <Reveal o={o} i={1} style={{ display: "flex", gap: 10 }}>
          <SocialButton href={site.socials.github} label="GitHub">
            <GitHubIcon />
          </SocialButton>
          <SocialButton href={site.socials.linkedin} label="LinkedIn">
            <LinkedInIcon />
          </SocialButton>
        </Reveal>
      </div>

      <Reveal o={o} i={2} style={{ marginTop: "1.6rem" }}>
        <FloatCard delay={0}>
          <p style={{ fontSize: "1.15rem", color: INK, margin: "0 0 1.1rem" }}>
            You scrolled the whole thing. Least I can do is buy you a coffee.
          </p>
          <div style={{ margin: "0.2rem 0 0.5rem" }}>
            <CalendlyInline url={site.calendly} />
          </div>
          <p style={{ fontSize: "0.9rem", color: SOFT, margin: "0.2rem 0 0" }}>
            Scheduler not loading?{" "}
            <a href={site.calendly} target="_blank" rel="noreferrer" style={link}>
              open my Calendly
            </a>
            .
          </p>
        </FloatCard>
      </Reveal>

      <Reveal o={o} i={3} style={{ marginTop: "1.2rem" }}>
        <FloatCard delay={0}>
          <p style={{ fontSize: "1.05rem", color: INK, margin: "0 0 1.2rem" }}>
            Prefer to type? Drop a note, or email{" "}
            <a href={`mailto:${site.email}`} style={link}>
              {site.email}
            </a>{" "}
            or{" "}
            <a href={`mailto:${site.emailAlt}`} style={link}>
              {site.emailAlt}
            </a>
            .
          </p>
          <form onSubmit={onSubmit}>
            <input style={field} placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={field} type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <textarea style={{ ...field, minHeight: 110, resize: "vertical" }} placeholder="Message" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
                background: GRAD,
                border: "none",
                borderRadius: 10,
                padding: "13px 24px",
                cursor: "pointer",
              }}
            >
              {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓" : "Send message"}
            </button>
            {status === "error" && (
              <span style={{ marginLeft: 12, fontFamily: SANS, fontSize: 13, color: ACCENT }}>
                Something went wrong. Email me directly.
              </span>
            )}
          </form>
        </FloatCard>
      </Reveal>
    </div>
  );
}

export type Section = "about" | "projects" | "experience" | "contact";

// Memoized: during the long content-pan the props (section + a near-constant t)
// don't change, so the panel — including its live iframes — stops re-rendering
// every scroll frame. t is quantized at the call site to keep memo effective.
export const ContentPanel = memo(function ContentPanel({ section, t = 1, live = true }: { section: Section; t?: number; live?: boolean }) {
  switch (section) {
    case "about":
      return <About o={t} />;
    case "projects":
      return <Projects o={t} live={live} />;
    case "experience":
      return <Experience o={t} />;
    case "contact":
      return <Contact o={t} />;
  }
});
