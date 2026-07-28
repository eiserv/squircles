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
- `squircles/react` adds the `Squircle`,
  `SquircleSurface`, and `useSquirclePath` APIs.
- React is an optional peer dependency. The geometry entry point does not load
  React.

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

- preserves the semantic host (`div`, `button`, `a`, or a custom React
  component);
- measures only layout-size changes with `ResizeObserver`;
- uses a rounded/native `corner-shape` fallback before the first measurement;
- does not clip focus outlines by default;
- keeps hover colors in CSS variables, so color changes do not recalculate the
  geometry.

`SquircleSurface` is the low-level SVG visual. It is useful inside an existing
component that already owns positioning, semantics, and fallback behavior.

## Known boundary

No renderer can make the two physical edges of an element land on identical
device-pixel phases when the element itself has a fractional physical-pixel
width. This package avoids amplifying that unavoidable rasterization detail:
it does not quantize layout to arbitrary quarter pixels, and it never combines
two independently rasterized contours.
