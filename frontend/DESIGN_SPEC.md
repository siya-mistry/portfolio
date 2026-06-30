# SIYONA — Portfolio Magazine · Design Spec

A scroll-driven 3D **Vogue-style fashion magazine**. Cover flips open to reveal **two-page spreads** (left + right page sharing a center spine). Each page is a `1080 × 1440` (3:4) Canvas-2D texture rendered in `pageRenderers.ts`. This spec is the single source of truth for visual layout. **Drop the pink entirely.**

---

## A. Palette

Classic traditional Vogue: near-black serif ink on warm ivory paper. Recommendation: **monochrome with one restrained editorial red**, used only as a thin rule, a section number, or a single italic word — never for blocks of text or backgrounds. If red is ever in doubt, omit it; pure monochrome is the safe elegant default.

| Token | Hex | Use |
|---|---|---|
| `PAPER` | `#f7f3ec` | Page background / warm ivory paper |
| `PAPER_HI` | `#fffdf9` | Cover vignette highlight (center) |
| `PAPER_LO` | `#efe8dd` | Cover vignette edge / spine shadow |
| `INK` | `#15130f` | Primary text, masthead, display headlines |
| `SOFT` | `#5f5a52` | Secondary / muted body, captions, folios |
| `FAINT` | `#9a9389` | Tertiary labels, "continued" notes |
| `RULE` | `#cfc6b8` | Hairline rules / dividers |
| `ACCENT` | `#8e1b1b` | **Editorial red — restrained.** Thin rules, section numbers (`Nº`), ONE italic accent word per spread max. Never fill text blocks with it. |

**Rules of restraint**

- No pink anywhere. Delete `#ff4d8d`.
- Red (`#8e1b1b`) appears at most **once or twice per page** and never larger than ~32px except a single masthead-issue accent.
- Body copy and headlines are always `INK` or `SOFT` — never red, never colored.
- Spine: paint a 2px vertical `RULE` line at the inner page edge plus a soft 24px gradient shadow (`PAPER_LO → transparent`) so the gutter reads like a real bound book.

---

## B. Typography

Available: **Playfair Display** (Didone — masthead + display), **EB Garamond** (body serif), **Montserrat** (sans — kickers, captions, labels, folios).

| Role | Font | Size px | Weight | Style | Tracking / Case |
|---|---|---|---|---|---|
| Masthead (cover) | Playfair Display | 250 | 900 | roman | normal, all-caps name |
| Display headline | Playfair Display | 92 | 800 | roman | normal |
| Display italic accent | Playfair Display | 80 | 600 | **italic** | normal (the "one italic word") |
| Sub-headline / deck | Playfair Display | 40 | 600 | italic | normal |
| Body serif | EB Garamond | 31 | 400 | roman | line-height 46px |
| Body lead-in (after drop cap) | EB Garamond | 31 | 400 | roman | first ~3 words may be small-caps Montserrat 22px |
| Drop cap | Playfair Display | 150 | 800 | roman | INK; spans ~3 body lines |
| Pull quote | Playfair Display | 50 | 500 | italic | line-height 64px |
| Kicker / section label | Montserrat | 22 | 600 | roman | **+4px letter-spacing, UPPERCASE** |
| Caption | Montserrat | 18 | 500 | roman | +1px tracking |
| Folio (page number + name) | Montserrat | 20 | 500 | roman | +2px tracking, UPPERCASE |
| Section number `Nº 0X` | Montserrat | 24 | 700 | roman | ACCENT, +2px tracking |

**Editorial devices (use these everywhere)**

- **Drop cap** opens every body column. First word's remaining letters may run small-caps for 2–3 words.
- **Hairline rules** (`RULE`, 1.5px) under kickers and between list items. One **ACCENT rule** (2px) may sit under a section number.
- **All-caps Montserrat kickers** with letter-spacing above every headline.
- **Pull quote** — one per spread, italic Playfair, flanked by short hairline rules above/below.
- **Page folios** bottom corners: outer corner = page number, opposite footer = `SIYONA MISTRY`.
- **Section numbers** `Nº 01 … Nº 03` in ACCENT to label each spread.
- Letter-spacing helper needed in canvas: render tracked text glyph-by-glyph (canvas `ctx.letterSpacing` is acceptable if supported; otherwise manual advance).

---

## C. Cover Layout (canvas 1080 × 1440)

Classic Vogue grid: giant masthead across the top, portrait centered with head in the upper-middle (overlapping the masthead baseline), cover lines stacked in the **left and right margins over the torso** — never over the face.

| Element | Position | Spec |
|---|---|---|
| Background | full | radial vignette `PAPER_HI` center (50%, 40%) → `PAPER_LO` edge |
| Masthead `SIYONA` | centered, baseline y≈250 | Playfair 250/900, INK, all-caps, `textAlign center`. Portrait head overlaps lower serifs (Vogue signature). |
| Issue line (left) | x=70, y=64 | Montserrat 22/600, SOFT, +3px tracking: `PORTFOLIO · ISSUE Nº 01` |
| Date (right) | x=PW-70, y=64, right-align | Montserrat 22/600, **ACCENT**: `JUNE 2026` (the single cover red accent) |
| Portrait | centered, bottom-anchored | `/media/portrait.webp`, scale to height ≈ `PH*0.78`, bottom at `PH-30`, head centered upper-middle |
| Cover line — left col | x=70, y=770 | Deck: Playfair italic 46/600 INK `The Engineer Issue` |
| | x=70, y=826 | Montserrat 22/600 +3px UPPERCASE INK `SOFTWARE ENGINEER` |
| | x=70, y=860 | EB Garamond 26/400 SOFT `Full-stack — React · Go · Python` |
| Cover line — right col | x=PW-70, y=770, right-align | Montserrat 22/700 +3px UPPERCASE INK `PROJECTS INSIDE` (NOT red) |
| | x=PW-70, y=806, right-align | EB Garamond 26/400 INK `PJ Gas · Krown Connect` |
| | x=PW-70, y=842, right-align | EB Garamond 26/400 SOFT `M.S. Machine Learning · Georgia Tech` |
| Bottom barcode-style line | x=70, y=PH-60 | thin ACCENT 2px rule, 120px wide — a subtle Vogue cover tick |
| Scroll hint | centered, y=PH-28 | Montserrat 18/500 FAINT +4px UPPERCASE `SCROLL TO TURN` |

**Face safe-zone:** keep all text outside a centered ellipse roughly `x ∈ [PW*0.30, PW*0.70]`, `y ∈ [220, 740]`. All cover lines live in the outer ~280px margins below y=760.

---

## D. The Spreads

Each spread = **left page + right page** composed as one unit. Shared margins: outer `M=88`, inner (gutter) `Mg=110` (extra room for the spine). Folios in outer-bottom corners. Every spread carries `Nº 0X` in ACCENT.

> **Leaf mapping note (for the developer):** in `buildLeaves`, the *back* of leaf N and the *front* of leaf N+1 become a visible spread. To make the pairs below land side-by-side, set leaves so that: cover.front=Cover; cover.back=Spread1-Left; leaf2.front=Spread1-Right; leaf2.back=Spread2-Left; leaf3.front=Spread2-Right; leaf3.back=Spread3-Left; leaf4.front=Spread3-Right. Author left pages to hug the **right** edge (gutter on right) and right pages to hug the **left** edge (gutter on left).

---

### Spread 1 — Contents (L) + About (R) · `Nº 01`

**LEFT PAGE — Contents / masthead colophon**

| Element | Pos | Spec |
|---|---|---|
| Section number | x=M, y=120 | `Nº 01` Montserrat 24/700 ACCENT |
| Kicker | x=M, y=156 | `IN THIS ISSUE` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176, M→PW-Mg | RULE 1.5px |
| Title | x=M, y=300 | Playfair 92/800 INK `Contents` |
| Contents list | x=M, start y=400, step 64 | each row: folio number Montserrat 24/600 ACCENT + title EB Garamond 30/400 INK, hairline RULE between rows |
| | | `02 — About` · `04 — Skills & Education` · `05 — Selected Projects` · `06 — Experience` · `07 — Contact` |
| Colophon block | x=M, y≈980 | Montserrat 16/500 SOFT, small-caps: `SIYONA MISTRY` / `SOFTWARE ENGINEER` / `ATLANTA · 2026` |
| Folio | x=M, y=PH-50 | `SIYONA MISTRY` (left) — page `02` bottom-right |

**RIGHT PAGE — Editorial "About"**

| Element | Pos | Spec |
|---|---|---|
| Kicker | x=Mg, y=156 | `PROFILE` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176, Mg→PW-M | RULE 1.5px |
| Headline | x=Mg, y=300 | Playfair 92/800 INK `The` |
| Italic accent | x=Mg, y=392 | Playfair italic 80/600 **ACCENT** `maker` (the one red word) |
| Drop cap | x=Mg, y=470 | `C` Playfair 150/800 INK |
| Body column | x=Mg+110 (wraps to PW-M), y=500 | EB Garamond 31/400 INK, line-height 46. Copy: *"Computer Science grad student specializing in Machine Learning, with a 4.0 undergrad GPA and a love for building things that ship — clean, tested, and maintainable, from Python and Go on the backend to React on the front."* |
| Pull quote | centered in column, y≈900 | hairline rule / Playfair italic 50/500 INK *"Build things that ship — clean, tested, maintainable."* / hairline rule |
| Caption | x=Mg, y=PH-120 | Montserrat 18/500 SOFT `M.S. Machine Learning — Georgia Tech · B.A. CS — UAB` |
| Folio | x=PW-M, y=PH-50, right | page `03` (left footer `SIYONA MISTRY`) |

---

### Spread 2 — Skills & Education (L) + Selected Projects (R) · `Nº 02`

**LEFT PAGE — Skills & Education**

| Element | Pos | Spec |
|---|---|---|
| Section number | x=M, y=120 | `Nº 02` Montserrat 24/700 ACCENT |
| Kicker | x=M, y=156 | `THE TOOLKIT` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176 | RULE 1.5px |
| Headline | x=M, y=300 | Playfair 92/800 INK `Skills &` |
| Italic accent | x=M, y=392 | Playfair italic 80/600 INK `study` |
| Block: Languages | heading y=480 | label Montserrat 24/600 +2px UPPERCASE INK; body EB Garamond 30/400 SOFT `Python · Java · Go · TypeScript · JavaScript` |
| Block: Tools & Methods | y=600 | `Kubernetes · Docker · Git · React · Agile` |
| Hairline | y=700 | RULE 1.5px |
| Block: Education | y=760 | heading `EDUCATION`; rows EB Garamond 30/400 INK: `M.S. Machine Learning — Georgia Tech` then SOFT `B.A. Computer Science — UAB · 4.0 GPA · minors Economics & Business` |
| Folio | bottom corners | page `04` |

**RIGHT PAGE — Selected Projects**

| Element | Pos | Spec |
|---|---|---|
| Kicker | x=Mg, y=156 | `SELECTED PROJECTS` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176 | RULE 1.5px |
| Headline | x=Mg, y=300 | Playfair 92/800 INK `Selected` |
| Italic accent | x=Mg, y=392 | Playfair italic 80/600 **ACCENT** `work` |
| Project 1 | y=500 | numbered `01` Montserrat 24/700 ACCENT; title Playfair 40/600 italic INK `PJ Gas`; url Montserrat 18/500 SOFT `pjgas.com`; body EB Garamond 28/400 SOFT (wrap, width to PW-M): *"Designed and built a live business site end to end — responsive layout, content, and deployment."* |
| Hairline | y≈700 | RULE 1.5px full column |
| Project 2 | y=760 | `02` ACCENT; `Krown Connect` Playfair 40/600 italic INK; `krownconnect.com` SOFT; body: *"Shipped a clean, modern marketing site with a polished, high-end feel."* |
| Caption | y=PH-120 | Montserrat 18/500 SOFT `More work at github.com/siya-mistry` |
| Folio | bottom corners | page `05` |

---

### Spread 3 — Experience (L) + Contact (R) · `Nº 03`

**LEFT PAGE — Experience**

| Element | Pos | Spec |
|---|---|---|
| Section number | x=M, y=120 | `Nº 03` Montserrat 24/700 ACCENT |
| Kicker | x=M, y=156 | `ON THE RECORD` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176 | RULE 1.5px |
| Headline | x=M, y=300 | Playfair 92/800 INK `Experience` |
| Entry 1 | y=440 | role Montserrat 24/600 UPPERCASE INK `SOFTWARE ENGINEER INTERN`; body EB Garamond 28/400 SOFT *"Built and shipped features across the stack."* ; hairline RULE below |
| Entry 2 | y=600 | `CS TEACHING ASSISTANT — UAB`; *"Supported students through core computer science coursework."* ; hairline |
| Entry 3 | y=760 | `DATA INTERN`; *"Hands-on with data pipelines and analysis."* |
| Folio | bottom corners | page `06` |

**RIGHT PAGE — Contact "Get in touch"**

| Element | Pos | Spec |
|---|---|---|
| Kicker | x=Mg, y=156 | `GET IN TOUCH` Montserrat 22/600 +4px UPPERCASE INK |
| Hairline | y=176 | RULE 1.5px |
| Headline | x=Mg, y=300 | Playfair 92/800 INK `Let's` |
| Italic accent | x=Mg, y=392 | Playfair italic 80/600 **ACCENT** `talk` |
| Drop cap intro | y=480 | drop cap `O` Playfair 150/800 INK; body EB Garamond 31/400 INK: *"Open to new-grad and internship software engineering roles, freelance web work, and interesting collaborations."* |
| Hairline | y≈720 | RULE 1.5px |
| Contact rows | y=780, step 70 | label Montserrat 22/600 UPPERCASE SOFT + value EB Garamond 30/400 INK: `EMAIL  spmistry@uab.edu` · `GITHUB  github.com/siya-mistry` · `LINKEDIN  linkedin.com/in/siyapmistry` |
| Sign-off | y=PH-130 | Playfair italic 40/600 INK `— Siyona` |
| Folio | bottom corners | page `07` (back cover could repeat masthead small + `FIN`) |

---

## E. Art Direction Notes

- **Black-and-white discipline.** Everything is `INK`/`SOFT` serif on `PAPER` ivory. The red (`#8e1b1b`) is a guest, not a resident — section numbers, one rule, one italic word per spread, the cover date. If a page already has two reds, stop.
- **The masthead carries the brand.** Oversized Playfair `SIYONA`, portrait head crossing its baseline — the single most "Vogue" move. Keep it huge and centered; never shrink it to fit cover lines.
- **Generous margins, strong hierarchy.** 88px outer / 110px gutter margins, big empty paper around a single dominant headline. Restraint reads as luxury; never fill the page.
- **Real bound-book gutter.** Hairline spine rule + soft inner-edge shadow on every page; left pages weight content toward the gutter, right pages mirror it, so a spread reads as one composition.
- **Portrait treatment.** Render the cutout as-is, but consider a subtle desaturated/duotone (ink-toned) pass for full editorial monochrome consistency; at minimum keep it warm and contrasty against the ivory. Add a faint contact shadow under the chin so she sits *on* the paper, not floating.
