# CSS-driven squircles for any element

Date: 2026-07-28
Status: approved, not yet implemented

## Problem

`squircles` 0.1.0 solves corner smoothing well for buttons and links, but it owns
more of the element than it should.

1. **It owns the paint.** `Squircle` forces `background-color: transparent` once
   measured, forces all four `border-*-radius` values, and offers no border at
   all except through the `stroke` and `strokeWidth` props. A consumer cannot
   express fill or border in a CSS class. Hover, focus, dark mode, and media
   queries have to be routed through CSS variables that are passed into props —
   a pattern the README shows but never establishes as the way.
2. **It cannot paint a gradient or a background image.** `fill` is a single
   color string.
3. **Void elements crash.** `<Squircle as="img">` and `<Squircle as="input">`
   throw `img is a self-closing tag and must neither have children nor use
   dangerouslySetInnerHTML`, because the component always renders an SVG child.
   Images are one of the most common uses for corner smoothing.
4. **Card shadows do not follow the shape.** A `box-shadow` follows the
   `border-radius` contour, not the squircle.
5. **There is no way to use it without React.**
6. **The playground demonstrates only buttons, and does not use the library on
   itself** — its own panels and stages run on `border-radius: 16px`.

## Goal

Adopting the library should change the corner shape and nothing else. Everything
a developer already knows about styling an element in CSS keeps working, on any
element.

## Decisions

| Decision | Choice |
|---|---|
| Styling source | Fully CSS-driven: the component reads computed styles |
| Paint split | Hybrid: surface via `clip-path`, border and shadow via SVG |
| Geometry source | CSS first (`border-radius`, `--squircle-smoothing`), props override |
| Non-React use | Yes — a `squircles/dom` helper |
| Shadow conflict | Inner surface layer (see below) |
| Playground | Both a vanilla page and a React page |

### The shadow conflict

`clip-path` and `box-shadow` are mutually exclusive on the same element:
`clip-path` removes everything outside the contour, including shadows and
including descendants. A shadow layer placed inside a clipped host is clipped
away. `filter: drop-shadow` on the host itself would also cast a shadow from the
element's text.

Resolution: the host is **not** clipped. Its background longhands are copied onto
an absolutely positioned inner layer, only that layer is clipped, and a second
absolutely positioned layer above it carries the `drop-shadow` filter.

## Architecture

### Entry points

| Entry point | Contents |
|---|---|
| `squircles` | Pure geometry, no dependencies. Existing `createSquirclePath()`. New `createSquircleClipPath()` returning a ready `path('…')` string. `inset` extended to accept negative values (outset), so shadow spread can be expressed. |
| `squircles/dom` | New, no React. `applySquircle(element, options)` returning a cleanup function. Sets up layers, observes resize, reads CSS. |
| `squircles/react` | `Squircle` (rebuilt on the CSS model), `SquircleSurface` (unchanged), `useSquirclePath`, new `useSquircleClipPath`. |

### What `Squircle` renders

```html
<button class="card" style="position:relative; isolation:isolate;
        background-color:transparent; border-color:transparent">
  <span data-squircle-shadow style="position:absolute; inset:0; z-index:-1;
        filter:drop-shadow(0 4px 12px rgba(0,0,0,.15))">
    <span data-squircle-fill style="position:absolute; inset:0;
          clip-path:path('…'); background-image:linear-gradient(…)"></span>
  </span>
  <svg data-squircle-stroke aria-hidden style="position:absolute; inset:0; z-index:-1">
    <path d="…" fill="none" stroke="#e5e7eb" stroke-width="1"/>
  </svg>
  Mehr erfahren
</button>
```

Both extra nodes are absolutely positioned, so flex and grid layouts are
unaffected. The host keeps its border box: `border-color` is set to
`transparent` rather than removing the border, so nothing shifts.

### Border quality

Separating surface and stroke does not break the rationale in
`docs/architecture.md`. The stroke is inset by half its width and completely
covers the clip edge of the surface, so there are still never two contours that
must agree.

One new boundary: with a **semi-transparent** border, the surface's clip edge
shows through the stroke. `SquircleSurface`, which still paints fill and stroke
on a single path, remains the escape hatch for that case. This is documented as
a known limit, not fixed.

### What is read from CSS

| Read from `getComputedStyle` | Becomes |
|---|---|
| `border-*-radius` (four corners) | Radius. Percentages are resolved against the measured size. |
| `--squircle-smoothing` | Smoothing, default `1` |
| `--squircle-preserve-smoothing` | `preserveSmoothing`, default `0` (off) |
| `border-top-width`, `border-top-color` | SVG stroke |
| `box-shadow` | `filter: drop-shadow(…)`; spread via an outset path |
| `background-color`, `-image`, `-size`, `-position`, `-repeat` | Surface layer paint |
| `transition-*` | Mirrored onto the surface layer so hover stays smooth |

Re-read triggers, all coalesced into one `requestAnimationFrame`:
`ResizeObserver`; `MutationObserver` on `class` and `style`; `pointerenter`,
`pointerleave`, `focusin`, `focusout`, `transitionrun`, `transitionend`.

### Explicitly unsupported

Documented as limits rather than silently broken:

- different borders per side — only `border-top-*` is read
- `inset` shadows
- multiple shadows are stacked as a list of `drop-shadow` filters, which is not
  identical to how `box-shadow` composites them
- semi-transparent borders (see above)

## API

### `Squircle`

Props: `as`, `radius`, `smoothing`, `preserveSmoothing`, `clipContent`, plus
everything the host element accepts. The four geometry props override whatever
CSS says; omitting them is the normal case.

`clipContent` keeps its current meaning: it additionally clips the host's
children to the outer contour, for cards that contain an image bleeding to the
edge. It stays off by default so focus outlines are not cut.

**Removed:** `fill`, `stroke`, `strokeWidth`, `surfaceClassName`, `surfaceStyle`.
They duplicate what CSS already does, and that duplication is the reason
migrating an existing component is not a drop-in today. This is a breaking
change; at 0.1.0 that is acceptable, and the migration is one line per component
(prop out, CSS in). The three layers are targetable from ordinary CSS via
`[data-squircle-fill]`, `[data-squircle-stroke]`, `[data-squircle-shadow]`.

Usage becomes:

```tsx
<Squircle as="button" className="button">Mehr erfahren</Squircle>
```

```css
.button {
  background: linear-gradient(#243a8f, #192d73);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  --squircle-smoothing: 1;
  padding: 12px 16px;
  color: white;
  transition: background-color 150ms;
}
.button:hover { background: #14245e; }
```

### Void elements

For `img`, `input`, and other void elements, `clip-path` is set directly on the
element and no extra nodes are created. The same detection is used by
`applySquircle`. Border and shadow are impossible there; the docs point to a
`Squircle` wrapper for those cases. This also fixes the crash described in
Problem 3.

### `SquircleSurface`

Unchanged. Remains the low-level single-path visual.

### `squircles/dom`

```ts
const dispose = applySquircle(element, { radius: 12, smoothing: 1 });
```

With no options it reads everything from CSS, exactly like the React component.

### `useSquircleClipPath`

```ts
const { clipPath, size, ready } = useSquircleClipPath(ref, options);
```

## Playground

Two pages behind one server.

- `examples/playground.html` stays vanilla and shapes its own UI — panels,
  stages, controls — with `squircles/dom`. The existing button comparison
  against `border-radius` stays, because it is the actual evidence. New
  sections: card with shadow, image, input, badge.
- `examples/react/` shows the same examples with `<Squircle as="…">` and plain
  CSS. This introduces the repository's first bundler: **esbuild** as a
  devDependency, one build call, no config file.

`scripts/serve-playground.mjs` serves both. `npm run playground` builds both.

## Testing

The DOM wiring is the hard part. Rather than pulling in jsdom — which models
neither `ResizeObserver` nor custom properties in `getComputedStyle` faithfully
— the CSS evaluation is extracted into pure functions that need no DOM:

- `parseBoxShadow(value)` → list of `drop-shadow` filters plus spread
- `resolveRadiusFromComputed(styles, size)` → four corners, percentages resolved
- `readSurfaceStyles(styles)` → background longhands

Additionally:

- geometry tests for the negative inset (outset)
- a format test for `createSquircleClipPath()`
- SSR tests for the new DOM structure, including `as="img"` as a regression test
  for the crash
- `scripts/create-visual-fixture.mjs` extended to cover card, shadow, and image

The DOM wiring itself — layer setup, re-read on hover — is verified in the
playground with Playwright. No unit test is claimed for it.

## Documentation

- README rebuilt around "only the corners change", with a migration section
  from 0.1
- `docs/architecture.md` gains the paint model and the new known limits
