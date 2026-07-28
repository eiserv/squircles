# CSS-driven squircles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `squircles` so that adopting it changes an element's corner shape and nothing else — geometry and paint are read from ordinary CSS, any element type is supported, and the library works without React.

**Architecture:** A pure-geometry core gains a `clip-path` helper. A new pure `src/css/` layer turns `CSSStyleDeclaration` values into plain data with no DOM access, so it is unit-testable under `node --test`. A new `src/dom/` layer builds three absolutely positioned sibling layers inside the host — shadow, fill, stroke — and keeps them in sync via `ResizeObserver` plus a coalesced re-read. The React `Squircle` becomes a thin wrapper that renders only the host element and calls `applySquircle` in an effect, so React never reconciles the layers and void elements no longer crash.

**Tech Stack:** TypeScript 6 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`), ESM only, `node --test` against `dist/`, React 19 as an optional peer dependency, esbuild for the React example page only.

**Spec:** [docs/superpowers/specs/2026-07-28-css-driven-squircles-design.md](../specs/2026-07-28-css-driven-squircles-design.md)

## Global Constraints

- The `squircles` root entry point must never import React or touch the DOM.
- `src/css/**` must not reference `window`, `document`, or any DOM global. It receives a `StyleReader`, which `CSSStyleDeclaration` structurally satisfies.
- Node `>=18`, `"type": "module"`, ESM only. Every relative import ends in `.js`.
- Tests run against `dist/`, never `src/`. `npm test` runs `npm run build` first.
- `exactOptionalPropertyTypes` is on: never pass `{ foo: undefined }` where the type says `foo?: T`. Build option objects conditionally, as `use-squircle-path.ts` already does.
- `noUncheckedIndexedAccess` is on: every array index access yields `T | undefined` and must be defaulted.
- `noUnusedLocals` and `noUnusedParameters` are on.
- Comments explain why, not what. Match the existing terse style in `src/geometry.ts`.
- Public API is documented in `README.md`; rendering rationale in `docs/architecture.md`.

## Two deviations from the spec, decided while planning

1. **No negative `inset` in `createSquirclePath`.** The spec proposed an outset mode so shadow spread could be expressed. It turned out unnecessary: a shadow with spread `s` is exactly a squircle of size `(w + 2s) × (h + 2s)` with radius `r + s`, which the existing signature already produces. YAGNI — the geometry stays untouched.
2. **Shadows are drawn as blurred colored shapes, not `filter: drop-shadow()`.** `drop-shadow` has no spread parameter, so spread would have needed a second mechanism anyway. One offset, blurred, clipped, colored layer per `box-shadow` entry handles offset, blur, spread, color, and multiple shadows through a single code path.

---

## File structure

| File | Responsibility |
|---|---|
| `src/size.ts` | Create. The shared `ElementSize` type, currently stranded in `src/react/use-element-size.ts`. |
| `src/clip-path.ts` | Create. `createSquircleClipPath()` — wraps a path in a CSS `path('…')` value. |
| `src/index.ts` | Modify. Export the two additions. |
| `src/css/types.ts` | Create. `StyleReader`, `SquircleShadow`, `SquircleBorder`, `SquircleSurface`. |
| `src/css/radius.ts` | Create. `resolveRadiusFromComputed()`, `resolveSmoothingFromComputed()`. |
| `src/css/shadow.ts` | Create. `parseBoxShadow()`. |
| `src/css/paint.ts` | Create. `readBorderFromComputed()`, `readSurfaceFromComputed()`. |
| `src/css/index.ts` | Create. Barrel for the pure readers. |
| `src/dom/void-elements.ts` | Create. `isVoidElement()`. |
| `src/dom/layers.ts` | Create. Builds and synchronises the shadow/fill/stroke layers. |
| `src/dom/apply-squircle.ts` | Create. `applySquircle()` — observation, coalescing, cleanup. |
| `src/dom/index.ts` | Create. Barrel for the `squircles/dom` entry point. |
| `src/react/squircle.tsx` | Rewrite. Host element plus an effect; no more paint props. |
| `src/react/use-squircle-clip-path.ts` | Create. `useSquircleClipPath()`. |
| `src/react/index.ts` | Modify. Drop nothing, add the new hook. |
| `src/react/squircle-surface.tsx` | Unchanged. Remains the single-path escape hatch. |
| `test/clip-path.test.mjs` | Create. |
| `test/css.test.mjs` | Create. The bulk of the new coverage — all pure. |
| `test/react.test.mjs` | Modify. New SSR expectations plus the `as="img"` regression. |
| `examples/playground.html` | Rewrite. Shapes itself, adds card/image/input/badge sections. |
| `examples/react/` | Create. React example page, built with esbuild. |
| `scripts/serve-playground.mjs` | Modify. Serve both pages. |
| `scripts/build-examples.mjs` | Create. esbuild call for the React page. |
| `scripts/create-visual-fixture.mjs` | Modify. Add card, shadow, and image cases. |
| `README.md`, `docs/architecture.md` | Rewrite / extend. |

---

### Task 1: Shared size type and the clip-path helper

**Files:**
- Create: `src/size.ts`
- Create: `src/clip-path.ts`
- Modify: `src/index.ts`
- Modify: `src/react/use-element-size.ts`
- Test: `test/clip-path.test.mjs`

**Interfaces:**
- Consumes: `createSquirclePath`, `SquirclePathOptions` from `src/geometry.ts`.
- Produces: `type ElementSize = Readonly<{ width: number; height: number }>` from `squircles`; `createSquircleClipPath(options: SquirclePathOptions): string` returning either `"none"` or `path('…')`.

- [ ] **Step 1: Write the failing test**

Create `test/clip-path.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createSquircleClipPath } from "../dist/index.js";

test("wraps a path in a CSS path() value", () => {
  const value = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
  });

  assert.ok(value.startsWith("path('M "), value);
  assert.ok(value.endsWith(" Z')"), value);
});

test("returns none for a degenerate box so the CSS value stays valid", () => {
  assert.equal(createSquircleClipPath({ width: 0, height: 48 }), "none");
  assert.equal(createSquircleClipPath({ width: 120, height: 0 }), "none");
});

test("passes options through to the geometry", () => {
  const inset = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
    inset: 0.5,
  });

  assert.ok(inset.startsWith("path('M 104.5 0.5 "), inset);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && node --test test/clip-path.test.mjs`
Expected: FAIL — `createSquircleClipPath is not a function`.

- [ ] **Step 3: Create the shared size type**

Create `src/size.ts`:

```ts
export type ElementSize = Readonly<{
  width: number;
  height: number;
}>;
```

- [ ] **Step 4: Create the clip-path helper**

Create `src/clip-path.ts`:

```ts
import { createSquirclePath, type SquirclePathOptions } from "./geometry.js";

/**
 * Builds a ready CSS `clip-path` value. Returns `none` for a degenerate box,
 * so the result is always assignable to the property.
 */
export function createSquircleClipPath(options: SquirclePathOptions): string {
  const path = createSquirclePath(options);
  return path === "" ? "none" : `path('${path}')`;
}
```

- [ ] **Step 5: Re-export from the root entry point**

Replace the contents of `src/index.ts`:

```ts
export { createSquircleClipPath } from "./clip-path.js";
export {
  createSquirclePath,
  resolveSquircleRadii,
  type SquircleCornerRadii,
  type SquirclePathOptions,
  type SquircleRadius,
} from "./geometry.js";
export type { ElementSize } from "./size.js";
```

- [ ] **Step 6: Point the React hook at the shared type**

In `src/react/use-element-size.ts`, delete the local `ElementSize` declaration (lines 8-11) and import it instead. The file already re-exports it, so `src/react/index.ts` needs no change.

Replace the import block and the type declaration with:

```ts
import {
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import type { ElementSize } from "../size.js";

export type { ElementSize };
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run build && node --test`
Expected: PASS — all existing tests plus the three new ones.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/size.ts src/clip-path.ts src/index.ts src/react/use-element-size.ts test/clip-path.test.mjs
git commit -m "feat: add createSquircleClipPath and share the ElementSize type"
```

---

### Task 2: Read radius and smoothing from computed styles

**Files:**
- Create: `src/css/types.ts`
- Create: `src/css/radius.ts`
- Create: `src/css/index.ts`
- Test: `test/css.test.mjs`

**Interfaces:**
- Consumes: `ElementSize` from `src/size.ts`, `SquircleCornerRadii` from `src/geometry.ts`.
- Produces:
  - `type StyleReader = Readonly<{ getPropertyValue(property: string): string }>`
  - `resolveRadiusFromComputed(styles: StyleReader, size: ElementSize): SquircleCornerRadii`
  - `resolveSmoothingFromComputed(styles: StyleReader): { smoothing: number; preserveSmoothing: boolean }`

Percentages resolve per axis and the smaller of the two wins, because a squircle corner is circular and the larger value would overflow the shorter side. Elliptical `border-radius` (two components) is therefore approximated by its inscribed circle.

- [ ] **Step 1: Write the failing test**

Create `test/css.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "../dist/css/index.js";

/** Minimal stand-in for CSSStyleDeclaration. */
function styles(values) {
  return {
    getPropertyValue: (property) => values[property] ?? "",
  };
}

test("reads four pixel corners", () => {
  const radii = resolveRadiusFromComputed(
    styles({
      "border-top-left-radius": "12px",
      "border-top-right-radius": "4px",
      "border-bottom-right-radius": "0px",
      "border-bottom-left-radius": "8px",
    }),
    { width: 200, height: 100 },
  );

  assert.deepEqual(radii, {
    topLeft: 12,
    topRight: 4,
    bottomRight: 0,
    bottomLeft: 8,
  });
});

test("resolves percentages against the shorter axis", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "50%" }),
    { width: 200, height: 100 },
  );

  // 50% of 200 is 100 horizontally, 50 vertically; the circle must fit both.
  assert.equal(radii.topLeft, 50);
});

test("takes the inscribed circle of an elliptical corner", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "40px 10px" }),
    { width: 200, height: 100 },
  );

  assert.equal(radii.topLeft, 10);
});

test("treats missing and unparseable values as zero", () => {
  const radii = resolveRadiusFromComputed(styles({}), {
    width: 200,
    height: 100,
  });

  assert.deepEqual(radii, {
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
  });
});

test("defaults smoothing to full and preserve to off", () => {
  assert.deepEqual(resolveSmoothingFromComputed(styles({})), {
    smoothing: 1,
    preserveSmoothing: false,
  });
});

test("reads smoothing and preserve from custom properties", () => {
  assert.deepEqual(
    resolveSmoothingFromComputed(
      styles({
        "--squircle-smoothing": " 0.6 ",
        "--squircle-preserve-smoothing": "1",
      }),
    ),
    { smoothing: 0.6, preserveSmoothing: true },
  );
});

test("clamps smoothing into the supported range", () => {
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "5" }))
      .smoothing,
    1,
  );
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "-2" }))
      .smoothing,
    0,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && node --test test/css.test.mjs`
Expected: FAIL — cannot find module `../dist/css/index.js`.

- [ ] **Step 3: Create the shared CSS types**

Create `src/css/types.ts`:

```ts
/**
 * The slice of CSSStyleDeclaration these readers need. Declaring it
 * structurally keeps this directory free of DOM types and testable in Node.
 */
export type StyleReader = Readonly<{
  getPropertyValue(property: string): string;
}>;
```

- [ ] **Step 4: Implement the radius reader**

Create `src/css/radius.ts`:

```ts
import type { SquircleCornerRadii } from "../geometry.js";
import type { ElementSize } from "../size.js";
import type { StyleReader } from "./types.js";

const CORNER_PROPERTIES = {
  topLeft: "border-top-left-radius",
  topRight: "border-top-right-radius",
  bottomRight: "border-bottom-right-radius",
  bottomLeft: "border-bottom-left-radius",
} as const;

function toPixels(value: string, basis: number): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return value.trimEnd().endsWith("%") ? (parsed / 100) * basis : parsed;
}

/**
 * A squircle corner is circular, so an elliptical CSS corner is reduced to the
 * circle that fits inside it. Percentages resolve per axis first.
 */
function resolveCorner(value: string, size: ElementSize): number {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const horizontal = parts[0] ?? "0";
  const vertical = parts[1] ?? horizontal;

  return Math.max(
    0,
    Math.min(toPixels(horizontal, size.width), toPixels(vertical, size.height)),
  );
}

export function resolveRadiusFromComputed(
  styles: StyleReader,
  size: ElementSize,
): SquircleCornerRadii {
  return {
    topLeft: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.topLeft),
      size,
    ),
    topRight: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.topRight),
      size,
    ),
    bottomRight: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.bottomRight),
      size,
    ),
    bottomLeft: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.bottomLeft),
      size,
    ),
  };
}

export function resolveSmoothingFromComputed(styles: StyleReader): {
  smoothing: number;
  preserveSmoothing: boolean;
} {
  const raw = Number.parseFloat(
    styles.getPropertyValue("--squircle-smoothing"),
  );
  const preserve = styles
    .getPropertyValue("--squircle-preserve-smoothing")
    .trim();

  return {
    smoothing: Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1,
    preserveSmoothing: preserve !== "" && preserve !== "0" && preserve !== "false",
  };
}
```

- [ ] **Step 5: Create the barrel**

Create `src/css/index.ts`:

```ts
export {
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "./radius.js";
export type { StyleReader } from "./types.js";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run build && node --test test/css.test.mjs`
Expected: PASS — seven tests.

- [ ] **Step 7: Commit**

```bash
git add src/css test/css.test.mjs
git commit -m "feat: read radius and smoothing from computed styles"
```

---

### Task 3: Parse box-shadow into plain data

**Files:**
- Create: `src/css/shadow.ts`
- Modify: `src/css/types.ts`
- Modify: `src/css/index.ts`
- Test: `test/css.test.mjs` (append)

**Interfaces:**
- Produces:
  - `type SquircleShadow = Readonly<{ color: string; offsetX: number; offsetY: number; blur: number; spread: number }>`
  - `parseBoxShadow(value: string): readonly SquircleShadow[]`

Both Chrome and Firefox serialise computed `box-shadow` with the colour first, which the parser relies on. `inset` shadows and `none` yield no entries.

- [ ] **Step 1: Write the failing test**

Append to `test/css.test.mjs`:

```js
import { parseBoxShadow } from "../dist/css/index.js";

test("returns nothing for none", () => {
  assert.deepEqual(parseBoxShadow("none"), []);
  assert.deepEqual(parseBoxShadow(""), []);
});

test("parses a single shadow with all four lengths", () => {
  assert.deepEqual(parseBoxShadow("rgba(0, 0, 0, 0.15) 0px 4px 12px 2px"), [
    { color: "rgba(0, 0, 0, 0.15)", offsetX: 0, offsetY: 4, blur: 12, spread: 2 },
  ]);
});

test("defaults blur and spread when omitted", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) 1px 2px"), [
    { color: "rgb(0, 0, 0)", offsetX: 1, offsetY: 2, blur: 0, spread: 0 },
  ]);
});

test("splits multiple shadows without breaking on colour commas", () => {
  const shadows = parseBoxShadow(
    "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgba(0, 0, 0, 0.2) 0px 8px 24px -4px",
  );

  assert.equal(shadows.length, 2);
  assert.equal(shadows[0].color, "rgba(0, 0, 0, 0.1)");
  assert.equal(shadows[1].offsetY, 8);
  assert.equal(shadows[1].spread, -4);
});

test("skips inset shadows", () => {
  const shadows = parseBoxShadow(
    "rgb(0, 0, 0) 0px 2px 4px 0px inset, rgb(255, 0, 0) 0px 3px 6px 0px",
  );

  assert.equal(shadows.length, 1);
  assert.equal(shadows[0].color, "rgb(255, 0, 0)");
});

test("handles negative offsets", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) -2px -4px 8px 0px"), [
    { color: "rgb(0, 0, 0)", offsetX: -2, offsetY: -4, blur: 8, spread: 0 },
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && node --test test/css.test.mjs`
Expected: FAIL — `parseBoxShadow` is not exported.

- [ ] **Step 3: Add the shadow type**

Append to `src/css/types.ts`:

```ts
export type SquircleShadow = Readonly<{
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
}>;
```

- [ ] **Step 4: Implement the parser**

Create `src/css/shadow.ts`:

```ts
import type { SquircleShadow } from "./types.js";

const COLOR = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|\b[a-z]+\b(?!\s*\())/i;
const LENGTH = /-?\d*\.?\d+px/g;

/** Splits on commas that are not inside a colour function. */
function splitShadows(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  parts.push(current);

  return parts.filter((part) => part.trim() !== "");
}

/**
 * Computed `box-shadow` always serialises the colour first, which is why the
 * colour can be lifted out before the lengths are read.
 */
function parseShadow(part: string): SquircleShadow | null {
  const text = part.trim();

  if (text === "" || text === "none" || /\binset\b/.test(text)) {
    return null;
  }

  const color = COLOR.exec(text)?.[0] ?? "currentColor";
  const lengths = text.replace(color, " ").match(LENGTH);

  if (!lengths || lengths.length < 2) {
    return null;
  }

  const [offsetX = "0", offsetY = "0", blur = "0", spread = "0"] = lengths;

  return {
    color,
    offsetX: Number.parseFloat(offsetX),
    offsetY: Number.parseFloat(offsetY),
    blur: Number.parseFloat(blur),
    spread: Number.parseFloat(spread),
  };
}

export function parseBoxShadow(value: string): readonly SquircleShadow[] {
  if (value.trim() === "" || value.trim() === "none") {
    return [];
  }

  return splitShadows(value)
    .map(parseShadow)
    .filter((shadow): shadow is SquircleShadow => shadow !== null);
}
```

- [ ] **Step 5: Export it**

Add to `src/css/index.ts`:

```ts
export { parseBoxShadow } from "./shadow.js";
export type { SquircleShadow, StyleReader } from "./types.js";
```

(replacing the existing `export type { StyleReader }` line)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run build && node --test test/css.test.mjs`
Expected: PASS — thirteen tests.

- [ ] **Step 7: Commit**

```bash
git add src/css test/css.test.mjs
git commit -m "feat: parse box-shadow into plain shadow data"
```

---

### Task 4: Read border and surface paint from computed styles

**Files:**
- Create: `src/css/paint.ts`
- Modify: `src/css/types.ts`
- Modify: `src/css/index.ts`
- Test: `test/css.test.mjs` (append)

**Interfaces:**
- Produces:
  - `type SquircleBorder = Readonly<{ width: number; color: string }>`
  - `type SquircleSurface = Readonly<{ backgroundColor: string; backgroundImage: string; backgroundSize: string; backgroundPosition: string; backgroundRepeat: string; transition: string }>`
  - `readBorderFromComputed(styles: StyleReader): SquircleBorder`
  - `readSurfaceFromComputed(styles: StyleReader): SquircleSurface`

Only `border-top-*` is read; per-side borders are out of scope by decision. `border-style: none` and anything other than `solid` yields width `0`, because dashed and dotted borders are deliberately unsupported.

- [ ] **Step 1: Write the failing test**

Append to `test/css.test.mjs`:

```js
import {
  readBorderFromComputed,
  readSurfaceFromComputed,
} from "../dist/css/index.js";

test("reads a solid border", () => {
  assert.deepEqual(
    readBorderFromComputed(
      styles({
        "border-top-width": "1.5px",
        "border-top-style": "solid",
        "border-top-color": "rgb(229, 231, 235)",
      }),
    ),
    { width: 1.5, color: "rgb(229, 231, 235)" },
  );
});

test("reports no border for unsupported styles", () => {
  for (const style of ["none", "dashed", "dotted", "double"]) {
    assert.deepEqual(
      readBorderFromComputed(
        styles({
          "border-top-width": "2px",
          "border-top-style": style,
          "border-top-color": "rgb(0, 0, 0)",
        }),
      ),
      { width: 0, color: "rgb(0, 0, 0)" },
      style,
    );
  }
});

test("reports no border for a zero width", () => {
  assert.equal(
    readBorderFromComputed(
      styles({ "border-top-width": "0px", "border-top-style": "solid" }),
    ).width,
    0,
  );
});

test("copies the background longhands and the transition", () => {
  assert.deepEqual(
    readSurfaceFromComputed(
      styles({
        "background-color": "rgb(25, 45, 115)",
        "background-image": "linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))",
        "background-size": "cover",
        "background-position": "50% 50%",
        "background-repeat": "no-repeat",
        transition: "background-color 150ms ease",
      }),
    ),
    {
      backgroundColor: "rgb(25, 45, 115)",
      backgroundImage: "linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))",
      backgroundSize: "cover",
      backgroundPosition: "50% 50%",
      backgroundRepeat: "no-repeat",
      transition: "background-color 150ms ease",
    },
  );
});

test("falls back to transparent and none for a bare element", () => {
  assert.deepEqual(readSurfaceFromComputed(styles({})), {
    backgroundColor: "transparent",
    backgroundImage: "none",
    backgroundSize: "auto",
    backgroundPosition: "0% 0%",
    backgroundRepeat: "repeat",
    transition: "none",
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && node --test test/css.test.mjs`
Expected: FAIL — `readBorderFromComputed` is not exported.

- [ ] **Step 3: Add the types**

Append to `src/css/types.ts`:

```ts
export type SquircleBorder = Readonly<{
  width: number;
  color: string;
}>;

export type SquircleSurface = Readonly<{
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  transition: string;
}>;
```

- [ ] **Step 4: Implement the readers**

Create `src/css/paint.ts`:

```ts
import type { SquircleBorder, SquircleSurface, StyleReader } from "./types.js";

function read(styles: StyleReader, property: string, fallback: string): string {
  const value = styles.getPropertyValue(property).trim();
  return value === "" ? fallback : value;
}

/**
 * Only the top border is read. Per-side borders and dashed or dotted styles
 * cannot be expressed as a single SVG stroke and are out of scope.
 */
export function readBorderFromComputed(styles: StyleReader): SquircleBorder {
  const style = read(styles, "border-top-style", "none");
  const width = Number.parseFloat(read(styles, "border-top-width", "0"));
  const color = read(styles, "border-top-color", "transparent");

  return {
    width: style === "solid" && Number.isFinite(width) ? Math.max(0, width) : 0,
    color,
  };
}

export function readSurfaceFromComputed(styles: StyleReader): SquircleSurface {
  return {
    backgroundColor: read(styles, "background-color", "transparent"),
    backgroundImage: read(styles, "background-image", "none"),
    backgroundSize: read(styles, "background-size", "auto"),
    backgroundPosition: read(styles, "background-position", "0% 0%"),
    backgroundRepeat: read(styles, "background-repeat", "repeat"),
    transition: read(styles, "transition", "none"),
  };
}
```

- [ ] **Step 5: Export them**

Replace the type export line in `src/css/index.ts` and add the readers, so the file reads:

```ts
export {
  readBorderFromComputed,
  readSurfaceFromComputed,
} from "./paint.js";
export {
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "./radius.js";
export { parseBoxShadow } from "./shadow.js";
export type {
  SquircleBorder,
  SquircleShadow,
  SquircleSurface,
  StyleReader,
} from "./types.js";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run build && node --test test/css.test.mjs`
Expected: PASS — eighteen tests.

- [ ] **Step 7: Commit**

```bash
git add src/css test/css.test.mjs
git commit -m "feat: read border and surface paint from computed styles"
```

---

### Task 5: Void-element detection and the layer builder

**Files:**
- Create: `src/dom/void-elements.ts`
- Create: `src/dom/layers.ts`
- Test: `test/css.test.mjs` (append — `isVoidElement` is pure)

**Interfaces:**
- Consumes: everything from `src/css/index.js`, `createSquirclePath` and `createSquircleClipPath`, `ElementSize`.
- Produces:
  - `isVoidElement(tag: string): boolean`
  - `type SquircleGeometryOptions = Readonly<{ radius?: SquircleRadius; smoothing?: number; preserveSmoothing?: boolean; clipContent?: boolean }>`
  - `syncLayers(host: HTMLElement, size: ElementSize, options: SquircleGeometryOptions): void`
  - `clearLayers(host: HTMLElement): void`

The host is never clipped, so shadows survive. Layer order inside the host, all `position: absolute; inset: 0`:

| Layer | z-index | Purpose |
|---|---|---|
| `[data-squircle-shadow]` (one per shadow) | -3 | Offset, blurred, colour-filled, clipped shape |
| `[data-squircle-fill]` | -2 | The host's copied background, clipped |
| `[data-squircle-stroke]` | -1 | SVG path carrying the border as a stroke |

- [ ] **Step 1: Write the failing test**

Append to `test/css.test.mjs`:

```js
import { isVoidElement } from "../dist/dom/index.js";

test("recognises void elements", () => {
  for (const tag of ["img", "input", "br", "hr", "IMG", "INPUT"]) {
    assert.equal(isVoidElement(tag), true, tag);
  }
});

test("does not treat container elements as void", () => {
  for (const tag of ["div", "button", "a", "span", "section"]) {
    assert.equal(isVoidElement(tag), false, tag);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && node --test test/css.test.mjs`
Expected: FAIL — cannot find module `../dist/dom/index.js`.

- [ ] **Step 3: Implement void-element detection**

Create `src/dom/void-elements.ts`:

```ts
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

/**
 * Void elements cannot hold layers, so they are shaped with `clip-path`
 * directly and lose border and shadow support.
 */
export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag.toLowerCase());
}
```

- [ ] **Step 4: Implement the layer builder**

Create `src/dom/layers.ts`:

```ts
import {
  parseBoxShadow,
  readBorderFromComputed,
  readSurfaceFromComputed,
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "../css/index.js";
import { createSquircleClipPath } from "../clip-path.js";
import { createSquirclePath, type SquircleRadius } from "../geometry.js";
import type { ElementSize } from "../size.js";
import { isVoidElement } from "./void-elements.js";

export type SquircleGeometryOptions = Readonly<{
  radius?: SquircleRadius;
  smoothing?: number;
  preserveSmoothing?: boolean;
  clipContent?: boolean;
}>;

const FILL = "data-squircle-fill";
const STROKE = "data-squircle-stroke";
const SHADOW = "data-squircle-shadow";
const SELECTOR = `[${FILL}], [${STROKE}], [${SHADOW}]`;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Inline properties the host loses to the layers and gets back on cleanup. */
const OVERRIDDEN = [
  "background-color",
  "background-image",
  "border-color",
  "box-shadow",
  "clip-path",
  "position",
  "isolation",
] as const;

const originalInline = new WeakMap<HTMLElement, string>();

function rememberInline(host: HTMLElement): void {
  if (!originalInline.has(host)) {
    originalInline.set(host, host.style.cssText);
  }
}

/**
 * Reads the styles the author wrote rather than the ones this module applied,
 * by lifting the overrides for the duration of the read. Costs one style
 * recalculation, which is why reads are coalesced by the caller.
 */
function readAuthoredStyles(host: HTMLElement): CSSStyleDeclaration {
  const applied = host.style.cssText;

  for (const property of OVERRIDDEN) {
    host.style.removeProperty(property);
  }

  const computed = getComputedStyle(host);
  const snapshot = new Map<string, string>();
  const properties = [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
    "--squircle-smoothing",
    "--squircle-preserve-smoothing",
    "border-top-width",
    "border-top-style",
    "border-top-color",
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "transition",
    "box-shadow",
  ];

  for (const property of properties) {
    snapshot.set(property, computed.getPropertyValue(property));
  }

  host.style.cssText = applied;

  return {
    getPropertyValue: (property: string) => snapshot.get(property) ?? "",
  } as CSSStyleDeclaration;
}

function createLayer(marker: string, zIndex: number): HTMLElement {
  const layer = document.createElement("span");
  layer.setAttribute(marker, "");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = `position:absolute;inset:0;z-index:${zIndex};pointer-events:none;`;
  return layer;
}

export function clearLayers(host: HTMLElement): void {
  for (const layer of Array.from(host.querySelectorAll(SELECTOR))) {
    if (layer.parentElement === host) {
      layer.remove();
    }
  }

  const inline = originalInline.get(host);

  if (inline !== undefined) {
    host.style.cssText = inline;
    originalInline.delete(host);
  }
}

export function syncLayers(
  host: HTMLElement,
  size: ElementSize,
  options: SquircleGeometryOptions,
): void {
  rememberInline(host);

  const styles = readAuthoredStyles(host);
  const fromCss = resolveSmoothingFromComputed(styles);
  const radius = options.radius ?? resolveRadiusFromComputed(styles, size);
  const smoothing = options.smoothing ?? fromCss.smoothing;
  const preserveSmoothing =
    options.preserveSmoothing ?? fromCss.preserveSmoothing;
  const border = readBorderFromComputed(styles);
  const surface = readSurfaceFromComputed(styles);
  const shadows = parseBoxShadow(styles.getPropertyValue("box-shadow"));

  const shape = { ...size, radius, smoothing, preserveSmoothing };

  // A void element has no room for layers; only the clip survives.
  if (isVoidElement(host.tagName)) {
    host.style.setProperty("clip-path", createSquircleClipPath(shape));
    return;
  }

  clearLayers(host);
  rememberInline(host);

  if (getComputedStyle(host).position === "static") {
    host.style.setProperty("position", "relative");
  }

  host.style.setProperty("isolation", "isolate");

  for (const shadow of shadows) {
    const layer = createLayer(SHADOW, -3);
    layer.style.transform = `translate(${shadow.offsetX}px, ${shadow.offsetY}px)`;
    // CSS blur() takes a standard deviation; box-shadow's blur is twice that.
    layer.style.filter = `blur(${shadow.blur / 2}px)`;

    const shape2 = document.createElement("span");
    shape2.style.cssText = `position:absolute;inset:${-shadow.spread}px;`;
    shape2.style.background = shadow.color;
    shape2.style.clipPath = createSquircleClipPath({
      width: size.width + shadow.spread * 2,
      height: size.height + shadow.spread * 2,
      radius,
      smoothing,
      preserveSmoothing,
    });

    layer.append(shape2);
    host.append(layer);
  }

  host.style.setProperty("box-shadow", "none");

  const fill = createLayer(FILL, -2);
  fill.style.backgroundColor = surface.backgroundColor;
  fill.style.backgroundImage = surface.backgroundImage;
  fill.style.backgroundSize = surface.backgroundSize;
  fill.style.backgroundPosition = surface.backgroundPosition;
  fill.style.backgroundRepeat = surface.backgroundRepeat;
  fill.style.transition = surface.transition;
  fill.style.clipPath = createSquircleClipPath(shape);
  host.append(fill);

  host.style.setProperty("background-color", "transparent");
  host.style.setProperty("background-image", "none");

  if (border.width > 0) {
    const stroke = document.createElementNS(SVG_NAMESPACE, "svg");
    stroke.setAttribute(STROKE, "");
    stroke.setAttribute("aria-hidden", "true");
    stroke.setAttribute("focusable", "false");
    stroke.setAttribute("preserveAspectRatio", "none");
    stroke.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    stroke.style.cssText =
      "position:absolute;inset:0;z-index:-1;width:100%;height:100%;overflow:visible;pointer-events:none;display:block;";

    const path = document.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", border.color);
    path.setAttribute("stroke-width", String(border.width));
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("shape-rendering", "geometricPrecision");
    path.setAttribute(
      "d",
      createSquirclePath({ ...shape, inset: border.width / 2 }),
    );

    stroke.append(path);
    host.append(stroke);

    // Keeping the border box intact avoids a layout shift.
    host.style.setProperty("border-color", "transparent");
  }

  if (options.clipContent === true) {
    host.style.setProperty("clip-path", createSquircleClipPath(shape));
  }
}
```

- [ ] **Step 5: Create the barrel**

Create `src/dom/index.ts`:

```ts
export { isVoidElement } from "./void-elements.js";
export {
  clearLayers,
  syncLayers,
  type SquircleGeometryOptions,
} from "./layers.js";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run build && node --test test/css.test.mjs`
Expected: PASS — twenty tests.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit 0. The DOM types come from `@types/node`'s DOM-free lib set plus TypeScript's built-in `lib.dom.d.ts`; if `document` is unresolved, add `"lib": ["ES2022", "DOM"]` to `tsconfig.json` `compilerOptions`.

- [ ] **Step 8: Commit**

```bash
git add src/dom test/css.test.mjs tsconfig.json
git commit -m "feat: build shadow, fill, and stroke layers from CSS"
```

---

### Task 6: The applySquircle entry point

**Files:**
- Create: `src/dom/apply-squircle.ts`
- Modify: `src/dom/index.ts`
- Modify: `package.json`
- Modify: `tsconfig.build.json` (no change expected — verify `src/**/*.ts` already covers `src/dom`)

**Interfaces:**
- Consumes: `syncLayers`, `clearLayers`, `SquircleGeometryOptions`.
- Produces: `applySquircle(element: HTMLElement, options?: SquircleGeometryOptions): () => void`

- [ ] **Step 1: Implement the observer wiring**

Create `src/dom/apply-squircle.ts`:

```ts
import type { ElementSize } from "../size.js";
import {
  clearLayers,
  syncLayers,
  type SquircleGeometryOptions,
} from "./layers.js";

/** Matches the quantisation the React hook already uses. */
function roundLayoutSize(value: number): number {
  return Math.round(value * 64) / 64;
}

const REREAD_EVENTS = [
  "pointerenter",
  "pointerleave",
  "focusin",
  "focusout",
  "transitionrun",
  "transitionend",
] as const;

/**
 * Shapes an element from its own CSS and keeps it in sync. Returns a cleanup
 * function that removes the layers and restores the inline style.
 */
export function applySquircle(
  element: HTMLElement,
  options: SquircleGeometryOptions = {},
): () => void {
  let size: ElementSize | null = null;
  let frame = 0;
  let disposed = false;

  const sync = () => {
    frame = 0;

    if (disposed || !size || size.width <= 0 || size.height <= 0) {
      return;
    }

    syncLayers(element, size, options);
  };

  // Hover, focus, and class changes all land in the same frame.
  const schedule = () => {
    if (disposed || frame !== 0) {
      return;
    }

    frame = requestAnimationFrame(sync);
  };

  const measure = (width: number, height: number) => {
    const next = {
      width: roundLayoutSize(width),
      height: roundLayoutSize(height),
    };

    if (size?.width === next.width && size.height === next.height) {
      return;
    }

    size = next;
    schedule();
  };

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries.at(-1);

    if (!entry) {
      return;
    }

    const box = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : undefined;

    if (box) {
      measure(box.inlineSize, box.blockSize);
      return;
    }

    const rect = element.getBoundingClientRect();
    measure(rect.width, rect.height);
  });

  resizeObserver.observe(element, { box: "border-box" });

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(element, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  for (const type of REREAD_EVENTS) {
    element.addEventListener(type, schedule);
  }

  return () => {
    disposed = true;

    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }

    resizeObserver.disconnect();
    mutationObserver.disconnect();

    for (const type of REREAD_EVENTS) {
      element.removeEventListener(type, schedule);
    }

    clearLayers(element);
  };
}
```

- [ ] **Step 2: Export it**

Replace `src/dom/index.ts`:

```ts
export { applySquircle } from "./apply-squircle.js";
export {
  clearLayers,
  syncLayers,
  type SquircleGeometryOptions,
} from "./layers.js";
export { isVoidElement } from "./void-elements.js";
```

- [ ] **Step 3: Add the entry point**

In `package.json`, insert into `exports` between `"."` and `"./react"`:

```json
    "./dom": {
      "types": "./dist/dom/index.d.ts",
      "import": "./dist/dom/index.js"
    },
```

- [ ] **Step 4: Verify the build and the package contents**

Run: `npm run build && node -e "import('./dist/dom/index.js').then((m) => console.log(Object.keys(m)))"`
Expected: prints an array containing `applySquircle`, `clearLayers`, `isVoidElement`, `syncLayers`.

Run: `npm run check`
Expected: typecheck clean, all tests pass, `npm pack --dry-run` lists `dist/dom/index.js` and `dist/dom/index.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/dom package.json
git commit -m "feat: add the squircles/dom entry point"
```

---

### Task 7: Rebuild the React component on the CSS model

**Files:**
- Modify: `src/react/squircle.tsx` (full rewrite)
- Create: `src/react/use-squircle-clip-path.ts`
- Modify: `src/react/index.ts`
- Modify: `type-tests/react-api.tsx`
- Modify: `test/react.test.mjs`

**Interfaces:**
- Consumes: `applySquircle`, `SquircleGeometryOptions`, `isVoidElement`, `useElementSize`, `createSquircleClipPath`.
- Produces:
  - `SquircleProps<Component>` with own props `as`, `radius`, `smoothing`, `preserveSmoothing`, `clipContent` only
  - `useSquircleClipPath(ref, options): { clipPath: string; size: ElementSize | null; ready: boolean }`

`fill`, `stroke`, `strokeWidth`, `surfaceClassName`, and `surfaceStyle` are removed from `Squircle`. `SquircleSurface` keeps all of them. Because the layers are created imperatively, server-rendered markup is just the host element with its own CSS — the pre-hydration fallback is the author's `border-radius`, with no special-casing needed.

- [ ] **Step 1: Write the failing tests**

Replace `test/react.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Squircle, SquircleSurface } from "../dist/react/index.js";

test("renders the semantic host and nothing else", () => {
  const html = renderToStaticMarkup(
    createElement(
      Squircle,
      { as: "button", type: "button", radius: 8, className: "button" },
      "Mehr erfahren",
    ),
  );

  assert.equal(
    html,
    '<button type="button" class="button">Mehr erfahren</button>',
  );
});

test("does not crash on a void element", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, { as: "img", src: "/a.jpg", alt: "Ein Bild" }),
  );

  assert.equal(html, '<img src="/a.jpg" alt="Ein Bild"/>');
});

test("passes the caller's style through untouched", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, {
      as: "div",
      style: { padding: 12 },
    }),
  );

  assert.match(html, /style="padding:12px"/);
});

test("renders a deterministic fixed-size SVG surface on the server", () => {
  const html = renderToStaticMarkup(
    createElement(SquircleSurface, {
      width: 120,
      height: 48,
      radius: 8,
      fill: "#192d73",
      stroke: "#e5e7eb",
      strokeWidth: 1,
    }),
  );

  assert.match(html, /^<svg /);
  assert.match(html, /viewBox="0 0 120 48"/);
  assert.match(html, /data-squircle-ready=""/);
  assert.match(html, /vector-effect="non-scaling-stroke"/);
  assert.match(html, /shape-rendering="geometricPrecision"/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run build && node --test test/react.test.mjs`
Expected: FAIL — the first test fails on the extra inline styles, the second throws the self-closing-tag error.

- [ ] **Step 3: Rewrite the component**

Replace `src/react/squircle.tsx`:

```tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { applySquircle } from "../dom/apply-squircle.js";
import { isVoidElement } from "../dom/void-elements.js";
import type { SquircleGeometryOptions } from "../dom/layers.js";
import type { SquircleRadius } from "../geometry.js";

type PolymorphicRef<Component extends ElementType> =
  ComponentPropsWithRef<Component>["ref"];

type SquircleOwnProps = {
  as?: ElementType;
  children?: ReactNode;
  /** Overrides the element's own `border-radius`. */
  radius?: SquircleRadius;
  /** Overrides the element's own `--squircle-smoothing`. */
  smoothing?: number;
  preserveSmoothing?: boolean;
  /**
   * Additionally clips the element's children. Keep this false on controls
   * whose focus outline must remain visible.
   */
  clipContent?: boolean;
};

export type SquircleProps<Component extends ElementType = "div"> =
  SquircleOwnProps &
    Omit<
      ComponentPropsWithoutRef<Component>,
      keyof SquircleOwnProps | "as"
    > & {
      as?: Component;
    };

export type SquircleComponent = <Component extends ElementType = "div">(
  props: SquircleProps<Component> & {
    ref?: PolymorphicRef<Component>;
  },
) => ReactElement | null;

function SquircleImplementation(
  {
    as,
    children,
    radius,
    smoothing,
    preserveSmoothing,
    clipContent,
    ...elementProps
  }: SquircleProps<ElementType>,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const Element: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLElement);

  const options = useMemo<SquircleGeometryOptions>(
    () => ({
      ...(radius !== undefined ? { radius } : {}),
      ...(smoothing !== undefined ? { smoothing } : {}),
      ...(preserveSmoothing !== undefined ? { preserveSmoothing } : {}),
      ...(clipContent !== undefined ? { clipContent } : {}),
    }),
    [clipContent, preserveSmoothing, radius, smoothing],
  );

  useEffect(() => {
    const element = ref.current;
    return element ? applySquircle(element, options) : undefined;
  }, [options]);

  // The layers are appended imperatively, so a void host stays childless.
  return typeof Element === "string" && isVoidElement(Element) ? (
    <Element ref={ref} {...elementProps} />
  ) : (
    <Element ref={ref} {...elementProps}>
      {children}
    </Element>
  );
}

export const Squircle = forwardRef<
  HTMLElement,
  SquircleProps<ElementType>
>(SquircleImplementation) as unknown as SquircleComponent;
```

- [ ] **Step 4: Add the clip-path hook**

Create `src/react/use-squircle-clip-path.ts`:

```ts
import { useMemo, type RefObject } from "react";
import { createSquircleClipPath } from "../clip-path.js";
import type { SquirclePathOptions } from "../geometry.js";
import type { ElementSize } from "../size.js";
import { useElementSize } from "./use-element-size.js";

export type UseSquircleClipPathOptions = Omit<
  SquirclePathOptions,
  "width" | "height"
> & {
  size?: ElementSize;
};

export type SquircleClipPathResult = Readonly<{
  clipPath: string;
  size: ElementSize | null;
  ready: boolean;
}>;

/** Gives an own component the CSS `clip-path` value for its measured box. */
export function useSquircleClipPath<T extends Element>(
  ref: RefObject<T | null>,
  options: UseSquircleClipPathOptions = {},
): SquircleClipPathResult {
  const { size: fixedSize, radius, smoothing, preserveSmoothing, inset, precision } =
    options;
  const size = useElementSize(ref, fixedSize);
  const clipPath = useMemo(
    () =>
      size
        ? createSquircleClipPath({
            width: size.width,
            height: size.height,
            ...(radius !== undefined ? { radius } : {}),
            ...(smoothing !== undefined ? { smoothing } : {}),
            ...(preserveSmoothing !== undefined ? { preserveSmoothing } : {}),
            ...(inset !== undefined ? { inset } : {}),
            ...(precision !== undefined ? { precision } : {}),
          })
        : "none",
    [inset, precision, preserveSmoothing, radius, size, smoothing],
  );

  return { clipPath, size, ready: clipPath !== "none" };
}
```

- [ ] **Step 5: Update the React barrel**

Replace `src/react/index.ts`:

```ts
export {
  Squircle,
  type SquircleComponent,
  type SquircleProps,
} from "./squircle.js";
export {
  SquircleSurface,
  type SquircleSurfaceProps,
} from "./squircle-surface.js";
export {
  useSquircleClipPath,
  type SquircleClipPathResult,
  type UseSquircleClipPathOptions,
} from "./use-squircle-clip-path.js";
export {
  useSquirclePath,
  type SquirclePathResult,
  type UseSquirclePathOptions,
} from "./use-squircle-path.js";
export type { ElementSize } from "./use-element-size.js";
```

- [ ] **Step 6: Update the type tests**

Replace the button and default-props blocks in `type-tests/react-api.tsx`, since `strokeWidth` is gone:

```tsx
const button = (
  <Squircle as="button" type="submit" radius={8} smoothing={0.8}>
    Submit
  </Squircle>
);

const image = <Squircle as="img" src="/a.jpg" alt="Ein Bild" radius={16} />;

type InferredButtonProps = ComponentPropsWithoutRef<typeof Squircle>;
const defaultProps: InferredButtonProps = { radius: 12 };

// @ts-expect-error Paint is expressed in CSS, not in props.
const invalidPaint = <Squircle as="button" fill="#192d73" />;

// @ts-expect-error A native button does not accept href.
const invalidButton = <Squircle as="button" href="/wrong" />;
```

Add `void image;` and `void invalidPaint;` to the `void` block at the end of the file.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run build && node --test`
Expected: PASS — every test file.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/react type-tests/react-api.tsx test/react.test.mjs
git commit -m "feat!: drive Squircle from CSS and support any element"
```

---

### Task 8: Rebuild the vanilla playground

**Files:**
- Modify: `examples/playground.html` (rewrite)

The page keeps the button comparison against `border-radius`, because it is the evidence for the whole library, and shapes its own chrome with `applySquircle`. New demo sections: card with shadow, image, input, badge.

- [ ] **Step 1: Shape the page's own chrome**

In the `<script type="module">` block, replace the single import with:

```js
import { createSquirclePath } from "../dist/index.js";
import { applySquircle } from "../dist/dom/index.js";

// The playground is styled by the library it demonstrates.
for (const panel of document.querySelectorAll(".panel")) {
  applySquircle(panel);
}
```

and in the stylesheet give `.panel` the smoothing variable it now needs:

```css
.panel {
  border: 1px solid #dce1ed;
  border-radius: 16px;
  --squircle-smoothing: 1;
  background: white;
}
```

- [ ] **Step 2: Add the demo sections**

Insert after the `.insights` section, before `<section class="panel code">`:

```html
<section class="stages" style="margin-top: 24px">
  <article class="panel stage">
    <div class="stage__body">
      <div class="demo-card" id="demo-card">
        <img class="demo-card__image" id="demo-image" src="../docs/media/playground.png" alt="" />
        <div class="demo-card__body">
          <b>Card mit Schatten</b>
          <span>Hintergrund, Rand und Schatten kommen aus CSS.</span>
        </div>
      </div>
    </div>
    <p class="stage__caption"><b>Card</b><span>applySquircle()</span></p>
  </article>

  <article class="panel stage">
    <div class="stage__body" style="gap: 16px; grid-auto-flow: row">
      <input class="demo-input" id="demo-input" type="text" value="Eingabefeld" />
      <span class="demo-badge" id="demo-badge">Badge</span>
    </div>
    <p class="stage__caption"><b>Input und Badge</b><span>beliebige Elemente</span></p>
  </article>
</section>
```

with the matching CSS:

```css
.demo-card {
  width: 260px;
  background: white;
  border: 1px solid #dce1ed;
  border-radius: 20px;
  --squircle-smoothing: 1;
  box-shadow: 0 12px 32px rgba(25, 45, 115, 0.18);
  overflow: hidden;
}

.demo-card__image {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
  --squircle-smoothing: 1;
}

.demo-card__body {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  font-size: 13px;
}

.demo-card__body span { color: #52607f; }

.demo-input {
  width: 200px;
  padding: 10px 12px;
  border: 1px solid #b9c2d8;
  border-radius: 10px;
  --squircle-smoothing: 1;
  font: inherit;
  color: #192d73;
}

.demo-badge {
  padding: 6px 14px;
  background: #edaa2b;
  border-radius: 999px;
  --squircle-smoothing: 1;
  font-size: 12px;
  font-weight: 600;
  color: #192d73;
}
```

and the wiring, appended to the module script:

```js
for (const id of ["demo-card", "demo-image", "demo-input", "demo-badge"]) {
  applySquircle(document.getElementById(id));
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run playground`
Open <http://localhost:5173/> and confirm: the panels have smoothed corners, the card shows a smoothed shadow, the image is smoothed, the input keeps its border, and the existing button comparison still updates with the sliders.

- [ ] **Step 4: Commit**

```bash
git add examples/playground.html
git commit -m "docs: shape the playground with the library and demo more elements"
```

---

### Task 9: React example page

**Files:**
- Create: `examples/react/index.html`
- Create: `examples/react/main.tsx`
- Create: `scripts/build-examples.mjs`
- Modify: `scripts/serve-playground.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add esbuild**

Run: `npm install --save-dev --cache .npm-cache esbuild@^0.25.0`

- [ ] **Step 2: Write the example**

Create `examples/react/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Squircle } from "../../src/react/index.js";

function Demo() {
  return (
    <main>
      <h1>squircles with React</h1>
      <p>
        Every shape below is styled in plain CSS. The components receive no
        paint props at all.
      </p>

      <div className="row">
        <Squircle as="button" type="button" className="button">
          Mehr erfahren
        </Squircle>

        <Squircle as="a" href="#" className="button button--ghost">
          Kontakt
        </Squircle>
      </div>

      <div className="row">
        <Squircle as="article" className="card">
          <Squircle as="img" className="card__image" src="../../docs/media/playground.png" alt="" />
          <div className="card__body">
            <b>Card</b>
            <span>Background, border, and shadow come from CSS.</span>
          </div>
        </Squircle>

        <Squircle as="input" className="input" defaultValue="Eingabefeld" />
        <Squircle as="span" className="badge">Badge</Squircle>
      </div>
    </main>
  );
}

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Demo />
    </StrictMode>,
  );
}
```

Create `examples/react/index.html` with a `<div id="root"></div>`, a `<script type="module" src="./main.js"></script>`, and a stylesheet defining `.button`, `.card`, `.input`, and `.badge` with ordinary `background`, `border`, `border-radius`, `box-shadow`, and `--squircle-smoothing` declarations — mirroring the classes from Task 8 so the two pages stay comparable.

- [ ] **Step 3: Add the build script**

Create `scripts/build-examples.mjs`:

```js
import { build } from "esbuild";

await build({
  entryPoints: ["examples/react/main.tsx"],
  outfile: "examples/react/main.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  logLevel: "info",
});
```

- [ ] **Step 4: Wire up the scripts**

In `package.json`, replace the `playground` script and add the example build:

```json
    "build:examples": "node scripts/build-examples.mjs",
    "playground": "npm run build && npm run build:examples && node scripts/serve-playground.mjs"
```

Add `examples/react/main.js` to `.gitignore`.

- [ ] **Step 5: Serve both pages**

In `scripts/serve-playground.mjs`, extend the type map with `".tsx"` is not needed, but add `".png": "image/png"` so the card image loads, and leave `resolve()` otherwise unchanged — `/react/` requests already map into `examples/` only if prefixed, so change the default line to:

```js
const relative =
  requestPath === "/"
    ? "examples/playground.html"
    : requestPath === "/react/" || requestPath === "/react"
      ? "examples/react/index.html"
      : requestPath.slice(1);
```

- [ ] **Step 6: Verify both pages**

Run: `npm run playground`
Open <http://localhost:5173/> and <http://localhost:5173/react/>. Confirm the React page renders the button, link, card, image, input, and badge with smoothed corners and that the browser console is free of errors.

- [ ] **Step 7: Commit**

```bash
git add examples/react scripts/build-examples.mjs scripts/serve-playground.mjs package.json package-lock.json .gitignore
git commit -m "docs: add a React example page built with esbuild"
```

---

### Task 10: Documentation and the visual fixture

**Files:**
- Modify: `README.md` (rewrite)
- Modify: `docs/architecture.md`
- Modify: `scripts/create-visual-fixture.mjs`

- [ ] **Step 1: Extend the visual fixture**

In `scripts/create-visual-fixture.mjs`, add three cases to the `cases` array so the rasterisation fixture covers the new element types:

```js
  { width: 260, height: 180, radius: 20, smoothing: 1, strokeWidth: 1 },
  { width: 260, height: 120, radius: 12, smoothing: 1, strokeWidth: 0 },
  { width: 120, height: 32, radius: 999, smoothing: 1, strokeWidth: 1 },
```

Run: `npm run visual:fixture`
Expected: `.artifacts/visual-fixture.html` regenerates without error.

- [ ] **Step 2: Rewrite the README**

Restructure around one idea: only the corners change. Required sections, in order:

1. Intro — unchanged claims, plus "works on any element" and "no paint props".
2. What it looks like — keep both existing screenshots and their captions.
3. Why this exists — keep the existing rationale verbatim; it is still correct.
4. Install.
5. **React** — the new minimal example: `<Squircle as="button" className="button">` with a CSS block carrying `background`, `border`, `border-radius`, and `--squircle-smoothing`. Show `as="img"` and a card with `box-shadow`.
6. **Without React** — `applySquircle(element)` with its cleanup return.
7. **Existing components** — `SquircleSurface`, unchanged text.
8. **Geometry only** — keep, and add `createSquircleClipPath`.
9. **What is not supported** — the list from the spec: per-side borders, dashed and dotted borders, `inset` shadows, semi-transparent borders, `backdrop-filter`, and the pre-hydration `border-radius` fallback.
10. **Migrating from 0.1** — a table mapping `fill` → `background`, `stroke` → `border-color`, `strokeWidth` → `border-width`, `surfaceClassName`/`surfaceStyle` → `[data-squircle-fill]` and `[data-squircle-stroke]`.
11. Development — unchanged, plus `npm run playground` now serving `/react/` too.

- [ ] **Step 3: Extend the architecture document**

Add a "Paint model" section after "Layers" describing the three layers, the reason the host is not clipped (shadows would be cut away), and why the authored styles are read with the overrides temporarily lifted. Extend "Known boundary" with: semi-transparent borders reveal the fill's clip edge, per-side and dashed borders are out of scope, `inset` shadows are ignored, and each re-read costs one style recalculation.

- [ ] **Step 4: Full check**

Run: `npm run check`
Expected: typecheck clean, all tests pass, `npm pack --dry-run` succeeds.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/architecture.md scripts/create-visual-fixture.mjs .artifacts
git commit -m "docs: document the CSS-driven model and the 0.1 migration"
```

---

## Self-review

**Spec coverage.** Every spec section maps to a task: clip-path helper → 1; radius and smoothing from CSS → 2; box-shadow → 3; border and surface → 4; the three layers and void elements → 5; `squircles/dom` → 6; the React rewrite, removed props, and `useSquircleClipPath` → 7; the two playground pages → 8 and 9; documentation, migration, and known limits → 10. The spec's negative-`inset` requirement is intentionally dropped, with the reason recorded above.

**Type consistency.** `SquircleGeometryOptions` is defined in Task 5 and consumed unchanged in Tasks 6 and 7. `StyleReader` is defined in Task 2 and extended in Tasks 3 and 4. `ElementSize` moves to `src/size.ts` in Task 1 and is re-exported from `src/react/use-element-size.ts` so `src/react/index.ts` keeps compiling. `clearLayers` and `syncLayers` keep the same names in Tasks 5, 6, and 10.

**Known risk.** `readAuthoredStyles` lifts the inline overrides before every read, which costs a style recalculation per re-read. If profiling in Task 8 shows this is too expensive on pages with many squircles, the fallback is to cache the authored values per element and invalidate only on `MutationObserver` events rather than on hover and focus.
