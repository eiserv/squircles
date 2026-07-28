# Architecture

## Why SVG instead of a mask

The outer fill and border must be rasterized from the same geometry. Building a
border from an outer clip path plus a separately calculated inner mask has
three failure modes:

1. reducing the radius does not create an exact parallel offset of a smoothed
   Bézier curve;
2. `clip-path` and an encoded SVG mask can be rasterized in separate passes;
3. fractional layout sizes can quantize those two passes differently.

This package draws one SVG path with both `fill` and `stroke`. The path is inset
by half the stroke width, so the complete stroke stays inside the component
box. There is no inner contour to drift away from the outer contour.

## Layers

- `squircles` is pure geometry and has no runtime dependencies.
- `squircles/dom` adds `applySquircle`, which shapes any element from its own
  CSS. It has no React dependency.
- `squircles/react` adds the `Squircle`, `SquircleSurface`, `useSquirclePath`,
  and `useSquircleClipPath` APIs.
- React is an optional peer dependency. The geometry entry point does not load
  React and does not touch the DOM.
- `src/css/` converts `CSSStyleDeclaration` values into plain data. It never
  reaches for a DOM global, which is what makes it unit-testable under
  `node --test`.

## Paint model

`Squircle` renders only the host element and calls `applySquircle` in an effect,
so the paint layers never pass through React reconciliation. That is also why a
void element such as `img` works: nothing is rendered as its child.

`applySquircle` appends up to three kinds of absolutely positioned layer inside
the host, each with `pointer-events: none`:

| Layer | z-index | Purpose |
|---|---|---|
| `[data-squircle-shadow]` (one per shadow) | -3 | An offset, blurred, colour-filled shape, clipped to the contour grown by the shadow's spread |
| `[data-squircle-fill]` | -2 | The host's copied background longhands, clipped to the contour |
| `[data-squircle-stroke]` | -1 | An SVG path carrying the border as a stroke |

The host itself is deliberately **not** clipped. `clip-path` removes everything
outside the contour, including shadows and including descendants, so clipping
the host would make shadows impossible. Instead the host's background is copied
onto the fill layer and the host is set to `transparent`; its `border-color` is
set to `transparent` rather than removing the border, so the border box and the
layout stay intact.

Separating surface and stroke does not reintroduce the two-contour problem. The
stroke is inset by half its width and completely covers the fill's clip edge, so
there is still never a fill edge and a border edge that must agree. A
semi-transparent border is the exception: the clip edge shows through it, and
`SquircleSurface` remains the escape hatch for that case.

## Reading the author's CSS

Because the layers overwrite `background-color`, `background-image`,
`border-color`, and `box-shadow` on the host, those overrides are lifted again
for the duration of every read. Two consequences are worth knowing:

- each re-read costs one style recalculation, which is why reads are coalesced
  into a single `requestAnimationFrame`;
- transitions are suppressed during the read. Lifting an override on a property
  that carries a transition makes the browser interpolate from the override, so
  a plain read returns the value in flight rather than the authored target. A
  hovered button with a background transition would otherwise keep its idle
  colour.

## Geometry

The curve uses the cubic Bézier construction described in Figma's
"Desperately seeking squircles" article:

- smoothing `0` is a normal circular corner;
- smoothing `1` uses the full transition and no circular arc;
- each corner gets a proportional budget on its two adjacent sides;
- by default smoothing is reduced if the requested curve would exceed that
  budget, matching Figma's documented constraint;
- `preserveSmoothing` keeps the requested smoothing and compresses the first
  Bézier controls instead.

The implementation is original TypeScript structured around immutable corner
data, explicit input validation, per-corner radii, and stroke insetting. The
published Figma article and the MIT-licensed reference implementations are
credited in `NOTICE`.

## Rendering contract

`Squircle` is the high-level, polymorphic component. It:

- preserves the semantic host (`div`, `button`, `a`, `img`, or a custom React
  component);
- measures only layout-size changes with `ResizeObserver`;
- falls back to the element's own `border-radius` before the first measurement,
  which needs no special handling because the host keeps its own CSS;
- does not clip focus outlines by default;
- re-reads on `ResizeObserver`, on `class` and `style` mutations, and on
  `pointerenter`, `pointerleave`, `focusin`, `focusout`, `transitionrun`, and
  `transitionend`.

Void elements (`img`, `input`, and the rest) cannot hold layers. They get
`clip-path` directly and therefore support neither a border nor a shadow; wrap
them in a `Squircle` when those are needed.

`SquircleSurface` is the low-level SVG visual. It is useful inside an existing
component that already owns positioning, semantics, and fallback behavior.

## Known boundaries

No renderer can make the two physical edges of an element land on identical
device-pixel phases when the element itself has a fractional physical-pixel
width. This package avoids amplifying that unavoidable rasterization detail:
it does not quantize layout to arbitrary quarter pixels, and it never combines
two independently rasterized contours.

Beyond that, and by decision rather than by accident:

- `outline`, and therefore every focus ring, follows `border-radius`. No
  renderer exposes a hook to change that.
- Only `border-top-width`, `border-top-style`, and `border-top-color` are read.
  Per-side borders cannot be expressed as one stroke.
- Only `border-style: solid` is drawn. `stroke-dasharray` could approximate
  dashed and dotted borders, but the dash rhythm around a smoothed curve would
  not match what CSS draws.
- `inset` shadows are ignored and left on the element.
- Multiple shadows become one layer each. They composite as stacked layers
  rather than the way `box-shadow` composites its list.
- `backdrop-filter` on the host stays rectangular, because the host is not
  clipped.
- An element whose size is animated recalculates its path once per frame.
