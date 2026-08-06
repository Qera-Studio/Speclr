# Design — Icon Set Generator (`/spec/generate`)

> **Status:** design only — nothing built yet.
> **Date:** 2026-08-04
> **Companion to:** [`2026-07-23-spec-icon-tool-design.md`](2026-07-23-spec-icon-tool-design.md) (the validator this generator feeds).

---

## 1. What this is

A **client-only** page that takes **one source SVG** plus a background colour and emits the **complete icon set** — every file the existing icon checklist at `/spec` grades — such that every slot validates green when the output is fed straight back into that checklist.

Today the flow is: designer exports icons by hand → founder uploads 13 files into `/spec` → the tool reports what's wrong → back to the designer. The generator closes the loop: produce the files *from* the spec instead of grading files *against* it. The checklist stays the arbiter; the generator is just an author that already knows the rules.

**Why it's cheap to build:** the whole thing is `<canvas>` + `drawImage` + `toBlob`, plus one small hand-written ICO container writer. **No new dependency.** The `/spec` tool is already entirely client-side (no DB, no server actions, no network) and this sits in exactly the same envelope.

**Why it isn't trivial:** two specific interactions between the generator's natural output and the existing validator would make a naive implementation fail its own checklist. Both are documented in §4 and both have concrete fixes.

---

## 2. It's 13 files, not 11

The checklist has **11 slots** (`ICON_SPECS` in [`iconSpecData.ts`](../../../src/lib/spec/iconSpecData.ts)), but two of them are two-file slots:

| # | Slot id | File(s) the generator emits | Count |
|---|---|---|---|
| 1 | `favicon-ico` | `favicon.ico` (16+32+48 layers in one container) | 1 |
| 2 | `favicon-32` | `favicon-32x32.png` | 1 |
| 3 | `favicon-192` | `favicon-192x192.png` | 1 |
| 4 | `favicon-512` | `favicon-512x512.png` | 1 |
| 5 | `apple-touch-icon` | `apple-touch-icon.png` (180×180) | 1 |
| 6 | `manifest-icon-any` | `icon-192x192.png`, `icon-512x512.png` | 2 |
| 7 | `manifest-icon-maskable` | `icon-maskable-192x192.png`, `icon-maskable-512x512.png` | 2 |
| 8 | `og-image` | `og-image.png` (1200×630) | 1 |
| 9 | `og-image-square` | `og-image-square.png` (1200×1200) | 1 |
| 10 | `svg-favicon` | `favicon.svg` | 1 |
| 11 | `safari-pinned-tab` | `safari-pinned-tab.svg` | 1 |
| | | **total** | **13** |

The validator accepts *either* accepted size for slots 6 and 7 (`matchesAcceptedDimensions` is an `.some()`), so uploading one file satisfies the slot — but both files are needed for a real `manifest.json`, so the generator emits both.

---

## 3. What "all pass" mechanically means

Reading the validator end to end, a slot's verdict comes from [`computePassed`](../../../src/lib/spec/computePassed.ts):

```
failed = dimensionsOk === false || formatOk === false || transparencyIsWarning
if (failed)                                    → false   (red)
if (dimensionsOk === true)                     → true    (green)
if (!criteria.dimensions && formatOk === true) → true    (green — vector slots)
otherwise                                      → null    (amber, "review manually")
```

So there are exactly **three hard gates**, and everything else is advisory:

### Gate A — `dimensionsOk`
- **Raster:** `img.naturalWidth/naturalHeight` must exactly equal one of `spec.acceptedDimensions`. Canvas output is exact by construction. ✅ trivially satisfied.
- **ICO:** [`evaluateIcoDimensions`](../../../src/lib/spec/evaluateIco.ts) compares the *embedded layer widths* against accepted sizes. All three present (16/32/48) → clean pass with no note. Fewer → still passes but with a "missing" note. The generator emits all three.
- **SVG:** `acceptedDimensions` is `[]` → `dimensionsOk` is `'unknown'` and `criteria.dimensions` is `false`, so format alone carries the pass.

### Gate B — `formatOk` ([`formatMatches`](../../../src/lib/spec/useImageValidation.ts#L21))
- `png` → `file.type === 'image/png'`. `canvas.toBlob(cb, 'image/png')` produces exactly that MIME. ✅
- `svg` → `file.type === 'image/svg+xml'` **or** filename ends `.svg`. A `new File([text], 'favicon.svg', { type: 'image/svg+xml' })` satisfies both. ✅
- `ico` → filename ends `.ico`, **and** `parseIco` must report `isValidIco: true` (reserved 0, type 1, count ≥ 1, directory fits in the buffer) or the result short-circuits to a hard fail regardless.

### Gate C — `transparencyIsWarning`
Despite the name, this is a **hard fail**, not a warning. It is set when the asset carries transparency and `spec.requireOpaque` is `true`. Seven of eleven slots are `requireOpaque: true` — every favicon, the apple-touch-icon, and both manifest slots. This is the gate that traps a naive generator (§4.1).

### Advisory only (never change the verdict)
`checkAspectRatio`, `checkFileWeight`, `checkSafeZone`, and every `analyzeSvg` hygiene warning. They still surface in the UI as yellow nudges, so the goal is **zero warnings too**, not merely green.

#### File-weight headroom (all comfortable)
Budget is `clamp(maxPixelArea × 0.6, 100 KB, 700 KB)`, or a flat 50 KB for vectors ([`qualityChecks.ts`](../../../src/lib/spec/qualityChecks.ts)):

| Asset | Budget | Expected canvas output |
|---|---|---|
| `favicon-32x32.png` | 100 KB (floor) | < 2 KB |
| `favicon-512x512.png` | 153 KB | 10–40 KB |
| `og-image.png` (1200×630) | 443 KB | 20–60 KB |
| `og-image-square.png` | 700 KB (ceiling) | 30–80 KB |
| `favicon.ico` (48² area) | 100 KB (floor) | ~11.2 KB (see §5) |
| `favicon.svg` / `safari-pinned-tab.svg` | 50 KB | = source SVG size |

The only weight risk is a **source SVG heavier than 50 KB** (a traced/complex vector). Advisory only, but the generator should surface it at input time rather than let the user discover it after export.

---

## 4. The two traps

These are the reason this is a design doc and not a 40-line patch.

### 4.1 `favicon.ico` must carry **BMP** layers, not canvas PNGs

**The trap.** The obvious ICO writer wraps three `canvas.toBlob('image/png')` outputs in an ICO container — PNG-in-ICO is legal and universally supported (Vista+). But [`parseIco`](../../../src/lib/spec/parseIco.ts#L41) infers transparency from the PNG **IHDR colour type**, not from pixels:

```ts
const colorType = view.getUint8(offset + 25);
const hasAlpha = colorType === 4 || colorType === 6;
```

`canvas.toBlob('image/png')` **always** emits colour type 6 (truecolour + alpha), even when every pixel is alpha 255 — the 2D context has an alpha channel and the encoder does not strip it. So a perfectly opaque generated `favicon.ico` reads back as `hasAlpha: true` → `transparency: 'transparent'` → with `requireOpaque: true` → `transparencyIsWarning: true` → **`computePassed` returns `false`**. Red slot, on a file that is objectively opaque.

**The fix.** Emit **24-bit BMP** layers. `readBmpLayer` reads `biBitCount` and reports `hasAlpha: bitCount === 32`, so 24-bit is unambiguously opaque — matching reality, not working around the checker. 24-bit BMP-in-ICO is the *original* ICO encoding and is understood everywhere; PNG-in-ICO is the newer optional path. Uncompressed, so no encoder needed: ~35 lines, ~11.2 KB total (§5).

> **Note this is not a validator bug.** Reading colour type is the correct cheap heuristic for "could this file carry alpha" without decoding. The generator is what should change.

### 4.2 The maskable slot is self-contradictory today

**The contradiction.** `manifest-icon-maskable` sets `requireOpaque: true`, so a passing file has **alpha 255 on every pixel**. But [`checkSafeZone`](../../../src/lib/spec/imageAnalysis.ts#L104) detects "content bleeding into the mask clip region" purely by alpha:

```ts
const alpha = data[(y * width + x) * 4 + 3];
if (alpha > 0) { return { kind: 'safe-zone', ... } }
```

For any opaque icon, every ring pixel has alpha 255 → **the warning fires 100% of the time**, including on a correctly padded icon whose ring is nothing but flat background. The check is only meaningful for transparent maskable icons, which the same spec forbids.

It's advisory, so the slot still goes green. But the generator would emit a guaranteed permanent false alarm on two of its thirteen files, which erodes trust in every other warning the tool raises.

**The fix.** Sample the background from a corner pixel and treat a ring pixel as *content* only if it is both non-transparent **and** visually different from that background:

```ts
// Background = the top-left pixel. Ring content = anything that isn't it.
const bg = [data[0], data[1], data[2], data[3]];
const isContent = (i: number) =>
  data[i + 3] > 0 &&
  (Math.abs(data[i]     - bg[0]) > TOL ||
   Math.abs(data[i + 1] - bg[1]) > TOL ||
   Math.abs(data[i + 2] - bg[2]) > TOL ||
   Math.abs(data[i + 3] - bg[3]) > TOL);
```

Backwards compatible for the transparent case: if the corner is `alpha 0`, any `alpha > 0` ring pixel differs from it and still warns exactly as today. `TOL` of ~8 absorbs anti-aliasing and PNG-vs-canvas rounding.

**⚠️ This changes a lifted test — needs sign-off.** The existing fixture in [`imageAnalysis.test.ts`](../../../src/lib/spec/__tests__/imageAnalysis.test.ts#L177) builds a 10×10 buffer where *every* pixel is RGB `(0,0,0)` and only alpha varies. Under the new rule its `ringHasContent: true` case becomes a uniformly-black image — genuinely indistinguishable from "opaque black icon on a black background" — so it would stop warning and the test would fail.

`AGENTS.md` says lifted tests must pass unchanged. The honest reading is that the *fixture* is degenerate (it never gave the ring a distinguishing colour because the old check couldn't see colour), not that the assertion is wrong. The change is: give ring content a distinct RGB. That is strengthening the fixture, not weakening the test — but it is still an edit to a lifted test, so **confirm before doing it.**

**Alternative if that edit isn't acceptable:** scope the fix by only running the corner-sample path when the image is fully opaque, leaving the pure-alpha path (and its fixture) untouched. Slightly more code, zero test churn.

---

## 5. The ICO writer — exact byte layout

`src/lib/spec/writeIco.ts` — pure function, no DOM beyond the `ImageData` handed in:

```ts
export function writeIco(layers: { width: number; height: number; rgba: Uint8ClampedArray }[]): Blob
```

### ICONDIR — 6 bytes, once
| Offset | Type | Value |
|---|---|---|
| 0 | `u16` LE | `0` (reserved) |
| 2 | `u16` LE | `1` (type = icon) |
| 4 | `u16` LE | `N` (layer count = 3) |

### ICONDIRENTRY — 16 bytes per layer
| Offset | Type | Value |
|---|---|---|
| +0 | `u8` | width (`0` means 256; 16/32/48 fit directly) |
| +1 | `u8` | height |
| +2 | `u8` | `0` (colour count — 0 for ≥ 8bpp) |
| +3 | `u8` | `0` (reserved) |
| +4 | `u16` LE | `1` (colour planes) |
| +6 | `u16` LE | `24` (bit count) |
| +8 | `u32` LE | payload byte length |
| +12 | `u32` LE | payload offset from file start |

### Payload — BITMAPINFOHEADER (40 bytes) + XOR pixels + AND mask
| Offset | Type | Value |
|---|---|---|
| +0 | `u32` LE | `40` (`biSize`) |
| +4 | `i32` LE | width |
| +8 | `i32` LE | **height × 2** — the ICO convention: the header describes XOR + AND stacked |
| +12 | `u16` LE | `1` (`biPlanes`) |
| +14 | `u16` LE | `24` (`biBitCount`) — **this is the byte `parseIco` reads at `offset + 14`** |
| +16 | `u32` LE | `0` (`BI_RGB`, uncompressed) |
| +20 | `u32` LE | `0` (`biSizeImage`, legal for `BI_RGB`) |
| +24…+39 | | `0` × 4 (`biXPelsPerMeter`, `biYPelsPerMeter`, `biClrUsed`, `biClrImportant`) |

**XOR pixel data:** bottom-up rows (row `h-1` first), each pixel **BGR** (not RGB), row stride padded to a 4-byte boundary: `ceil(w × 3 / 4) × 4`.

**AND mask:** bottom-up, 1 bit per pixel, `1` = transparent. All zero (fully opaque), row stride `ceil(w / 8)` padded to 4 bytes. It is **not optional** — omitting it desyncs the offsets even though every bit is zero.

### Resulting size
| Layer | Header | XOR (`h × stride`) | AND (`h × stride`) | Total |
|---|---|---|---|---|
| 16×16 | 40 | 16 × 48 = 768 | 16 × 4 = 64 | 872 |
| 32×32 | 40 | 32 × 96 = 3072 | 32 × 4 = 128 | 3240 |
| 48×48 | 40 | 48 × 144 = 6912 | 48 × 8 = 384 | 7336 |
| | | | **+ 6 + 48 dir** | **11 502 B ≈ 11.2 KB** |

Well under the 100 KB budget floor. Uncompressed is the right call: compression buys nothing at this size and would mean writing a deflate encoder.

---

## 6. Rasterization pipeline

One shared helper, used by every raster output:

```ts
function render(svgText: string, w: number, h: number, bg: string, scale: number): Promise<ImageData>
```

1. **Normalize the source SVG.** Parse with `DOMParser`. If the root has no `viewBox` but has `width`/`height`, synthesize `viewBox="0 0 w h"`. Then **set explicit `width`/`height` attributes** matching the target size — without them Firefox and Safari report `naturalWidth: 0` for a viewBox-only SVG loaded into an `Image()`, and the draw silently produces nothing. Chrome is more forgiving, which makes this a classic works-on-my-machine bug.
2. **Load it.** Serialize back to text → `Blob` → `URL.createObjectURL` → `new Image()` → `await img.decode()`. Same-origin blob, and an SVG with no external references does not taint the canvas in any current browser — `getImageData` stays legal. (This is the same assumption `imageAnalysis.ts` already relies on.)
3. **Fill the background first.** `ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)`. This is what makes the output opaque, satisfying Gate C for the seven `requireOpaque` slots.
4. **Draw the mark centred**, scaled to `scale` of the short edge, preserving aspect ratio.
5. **Return `ctx.getImageData(...)`** — the ICO writer needs raw RGBA; PNG slots go via `canvas.toBlob(cb, 'image/png')`.

### Per-output parameters

| Output | Canvas | `bg` | `scale` |
|---|---|---|---|
| `favicon-*.png`, `icon-*.png`, `apple-touch-icon.png` | as specified | user bg | `1.0` (full-bleed) |
| `favicon.ico` layers | 16, 32, 48 | user bg | `1.0` |
| `icon-maskable-*.png` | 192, 512 | user bg | `maskableScale`, default **0.70** |
| `og-image.png` | 1200×630 | user bg | `ogScale`, default **0.40** of short edge |
| `og-image-square.png` | 1200×1200 | user bg | `ogScale` |

**On `maskableScale`.** The W3C maskable spec's safe zone is a **circle** of diameter 80% of the icon. The validator's `checkSafeZone` instead tests a **rectangular** inset of 10% per side (the inner 80% box). A square-bounded mark fully inside the 80% *circle* can only be `0.8 / √2 ≈ 0.566` — very conservative, and most real marks aren't square-bounded. `0.70` is the pragmatic middle that Android's own guidance lands near, clears the validator's box test comfortably, and still survives a circular OS mask for typical logos.

It stays a **user-adjustable knob**, not a constant. Different marks need different padding and no single number is right for all of them — this is exactly the kind of value that gets hard-coded and then quietly wrong.

---

## 7. SVG outputs

Neither SVG is rasterized; both are text transforms of the source.

### `favicon.svg`
Pass-through with the same normalization as step 1 above (`viewBox` injected if missing). `analyzeSvg` will also warn on:
- an embedded `<image>` — a raster inside a vector favicon,
- any `href`/`xlink:href` matching `^(https?:)?//` — external refs are a fetch/tracking surface and won't resolve as a favicon.

The generator **should not silently strip these** — they mean the source SVG has a real problem the founder should see and fix upstream. Surface them as input-time warnings instead. Rewriting the artwork behind the user's back is worse than shipping a warning.

### `safari-pinned-tab.svg`
Needs a **single-colour silhouette on transparency** — the one slot where transparency is expected rather than forbidden. `analyzeSvg`'s monochrome check collects every distinct `fill`/`stroke` attribute value (excluding `none`) across the document and warns when `size > 1`.

Transform: strip every `fill` and `stroke` attribute from all descendants, then set a single `fill` on the root `<svg>`. Descendants inherit; the set has exactly one member; no warning.

> **Caveat that needs a human eye.** This makes the file *validate*, and it is visually correct for a solid single-shape mark. A multi-colour logo whose structure depends on colour contrast (a light shape knocked out of a dark one) will flatten into an unreadable blob that still passes every automated check. The UI must show this file's preview prominently and say so. This is the one output the generator cannot fully guarantee.
>
> Also worth remembering, per the slot's own copy: `mask-icon` was **deprecated in Safari 12 (2018)**. Modern Safari pins the regular favicon. This file only matters for the pre-2018 macOS long tail — an imperfect silhouette here is low-stakes.

---

## 8. Route, UI, and file layout

### Route
`src/app/(admin)/spec/generate/page.tsx` — Server Component, matching the existing `/spec` pattern exactly:
- `export const metadata` with `robots: { index: false, follow: false }`
- `export const dynamic = 'force-dynamic'` (reads the Clerk session cookie)
- `requireAuthorizedUser()`; on throw redirect `UNAUTHORIZED → /no-access`, else `/sign-in`
- renders `<IconGenerator />` (client)

No server action, no DB, no network — same envelope as `/spec`. The auth gate is there because it's an internal route, not because the work is sensitive.

### Files
| Path | Responsibility | Purity |
|---|---|---|
| `src/lib/spec/writeIco.ts` | ICO container writer (§5) | pure, no DOM |
| `src/lib/spec/generateIcons.ts` | Orchestrator: source SVG + options → `{ filename, blob }[]` | needs DOM/canvas |
| `src/lib/spec/normalizeSvg.ts` | `viewBox` injection, explicit sizing, pinned-tab monochrome transform | pure-ish (DOMParser) |
| `src/components/spec/IconGenerator.tsx` | The page: inputs, previews, download | client |

`generateIcons` is deliberately the *only* place that knows the 13-file manifest, and it derives what it can from `ICON_SPECS` rather than re-listing sizes — so a spec change can't silently desync the generator from the checklist.

### UI
Existing shadcn primitives only — `Card`, `Input`, `Label`, `Button`, `Alert`, plus the existing `UploadDropzone` for the SVG input.

- **Inputs:** SVG file drop; background colour (`<input type="color">` + hex field, default `#ffffff`); `maskableScale` and `ogScale` number inputs.
- **Input-time warnings:** source SVG > 50 KB; embedded `<image>`; external `href`; no `viewBox`. Surfaced before generating, not after.
- **Preview:** a grid of all 13 rendered at display size, so the maskable padding and the pinned-tab silhouette are visible *before* download.
- **Download:** 13 sequential `<a download>` clicks. Browsers prompt "allow multiple downloads" once per origin.
- **Accessibility:** real `<label>` for every control, `getByRole`-reachable buttons, colour input paired with a text hex field so it isn't the only way to set the value.

**Why no zip.** A zip needs either a new dependency (attack surface, against `AGENTS.md`) or a hand-rolled STORE-method writer plus CRC32 (~45 lines that exist only to be immediately undone). The files get unzipped straight away to feed back into `/spec` slot by slot. If the multi-download prompt turns out to be genuinely annoying in practice, the zip writer is a contained follow-up — but building it first is speculative.

---

## 9. Testing

`npm test` must pass; per `AGENTS.md` the task isn't done until it does.

**Unit (jsdom, real assertions):**
- `writeIco` — the highest-value test by far, since it's hand-written binary. Feed known RGBA, then **round-trip through the project's own `parseIco`** and assert `isValidIco: true`, three layers at 16/32/48, `format: 'bmp'`, `hasAlpha: false` on every layer. That single assertion is exactly the condition trap 4.1 is about, so the test fails loudly if the encoding regresses.
- `writeIco` byte-level: BGR channel order (not RGB), bottom-up row order, 4-byte row padding for a width where it matters (48 → AND stride 6 padded to 8).
- `normalizeSvg` — `viewBox` synthesized from `width`/`height`; existing `viewBox` untouched; explicit `width`/`height` set on output; pinned-tab transform leaves exactly one distinct colour, verified by running the project's own `analyzeSvg` and asserting **no** `svg-monochrome` warning.
- `checkSafeZone` — the fixed version: warns for distinctly-coloured ring content on both transparent and opaque backgrounds; silent for a uniform-background ring. (Fixture change per §4.2 — sign-off first.)

**Component (RTL, `userEvent.setup()`, `getByRole`):** input validation surfaces its warnings; generate produces 13 named entries; the colour and scale inputs are labelled and keyboard-reachable.

**Browser (jsdom cannot do this — must be verified by hand):**
- Actual rasterization. jsdom has no canvas image decoder, so every rendering test is necessarily mocked; **the only proof the output is visually correct is looking at it.**
- Cross-browser `naturalWidth` on a viewBox-only SVG (§6 step 1) — the specific bug that only shows up outside Chrome.
- **The real proof:** generate a set, then upload all 13 into `/spec` and confirm 11/11 green with **zero warnings**. That end-to-end loop is the acceptance criterion; unit tests are just the fast feedback on the way there.

---

## 10. Out of scope / deferred

Deliberately not built. Add when there's a real need, not before.

- **Zip download** — §8. Adds a dependency or 45 speculative lines.
- **Server-side rendering (sharp/resvg)** — canvas in the browser is sufficient, adds no infra, and keeps the tool in the same client-only envelope as `/spec`. Revisit only if SVG rasterization fidelity proves inadequate.
- **Auto-tracing a real silhouette for the pinned tab** — needs raster-to-vector tracing. Deprecated slot, low stakes (§7).
- **Designed OG images** (headline text, layout, gradients) — the generator centres the mark on a flat background. A real OG image is a design asset, as the slot's own `industryStandard` copy says. Not a generator's job.
- **Writing `manifest.json` / the `<link>` tag block** — plausibly useful, genuinely separate, and not what was asked for.
- **Persisting generator settings** — no DB, no localStorage. Regenerating means re-entering a colour and two numbers.
- **PNG optimization (oxipng/zopfli)** — every output sits far inside its weight budget (§3). Nothing to fix.

---

## 11. Open questions — need sign-off before building

1. **The `checkSafeZone` fixture edit (§4.2).** Changing a lifted test's fixture. The proposed change strengthens it (ring content gets a distinguishing colour), but `AGENTS.md` is explicit that lifted tests pass unchanged. Approve the edit, or take the no-churn alternative (only run the new path when the image is fully opaque)?
2. **Default background.** `#ffffff` assumed. Qera's mark may want a brand background — but it must be **opaque**, since seven slots hard-fail on transparency.
3. **Scope of trap 4.1's fix.** Confirmed direction is "generator emits BMP", leaving `parseIco` untouched. The alternative — teaching `parseIco` to decode PNG pixels rather than read colour type — is more code in the *validator*, on the argument that a colour-type-6 all-opaque PNG genuinely is opaque. Recommend BMP: it's a smaller change, in the new code rather than the proven code.
4. **Does the pinned-tab file ship at all?** Deprecated since 2018, `nice-to-have` priority, and the one output needing a human eye. Dropping it makes the generator 12 files and fully automatic. Keeping it costs almost nothing but leaves one output that can pass validation while looking wrong.
