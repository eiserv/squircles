# squircles

Small Figma-style squircles for TypeScript and React.

Adopting it changes an element's corner shape and nothing else. Background,
border, shadow, hover, dark mode, and everything else stay in your CSS, where
you already know how to write them.

- zero dependencies in the geometry package;
- React is an optional peer dependency;
- works on any element — buttons, links, cards, images, inputs;
- geometry and paint are read from ordinary CSS, not from props;
- no data-URL masks, canvas, paint worklets, or CSS-in-JS;
- responsive via `ResizeObserver`;
- plain `border-radius` during SSR and before hydration;
- ESM, strict TypeScript, and tree-shakeable entry points.

## What it looks like

`examples/playground.html` draws the same button twice — once through
`createSquirclePath()`, once with plain `border-radius` — and updates both while
you move radius, smoothing, size, and stroke width:

```sh
npm run playground
```

![The playground with a 200 × 72 button at radius 24: the squircle and the
border-radius button side by side, their outlines overlaid, and the top left
corner magnified](docs/media/playground.png)

At button-sized radii the two shapes are close, which is why the overlay and the
magnified corner are part of the page: they are the honest way to see the
difference. Note the corner budget in the readout — at radius 24 on a 72px-tall
button, Figma's constraint already reduces the effective smoothing.

The difference grows with the radius. At a pill radius with `preserveSmoothing`,
the smoothed ends are visibly flatter than the semicircular `border-radius`
ends:

![The same playground at 360 × 120 with radius 60 and preserveSmoothing enabled:
the squircle pill has noticeably flatter ends than the border-radius
pill](docs/media/smoothing-extremes.png)

## Why this exists

Figma corner smoothing is not the same shape as `border-radius`. Existing web
solutions generally create an SVG path or clip path. A clip path works well for
fills, but a button border is easy to get wrong: subtracting a pixel from the
radius does not create the exact inner offset of a smoothed curve, and combining
a clip path with a separately rasterized mask can produce uneven-looking
one-pixel edges.

This package draws the border as a native SVG stroke on the smoothed path
itself, inset by half its width. The stroke is therefore exactly as thick at a
smoothed corner as it is along a straight edge, and nothing is clipped away.

## Install

```sh
npm install squircles
```

## React

Give the element a class and let CSS do the rest:

```tsx
import { Squircle } from "squircles/react";

export function CallToAction() {
  return (
    <Squircle as="button" type="button" className="button">
      Mehr erfahren
    </Squircle>
  );
}
```

```css
.button {
  background: linear-gradient(#243a8f, #192d73);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  --squircle-smoothing: 1;
  min-height: 48px;
  padding: 12px 16px;
  color: white;
  transition: background-color 150ms ease;
}

.button:hover {
  background: #14245e;
}

.button:focus-visible {
  outline: 2px solid #192d73;
  outline-offset: 4px;
}
```

The component reads `border-radius` and `--squircle-smoothing` from your CSS, so
it needs no props at all beyond `as`. Pass `radius`, `smoothing`, or
`preserveSmoothing` only when you want to override the stylesheet.

Cards and images work the same way:

```tsx
<Squircle as="article" className="card">
  <Squircle as="img" className="card__image" src="/foto.jpg" alt="" />
  <p>Ein Text</p>
</Squircle>
```

```css
.card {
  border-radius: 20px;
  --squircle-smoothing: 1;
  background: white;
  border: 1px solid #dce1ed;
  box-shadow: 0 12px 32px rgba(25, 45, 115, 0.18);
}
```

The shadow follows the smoothed contour rather than the `border-radius` one.

Use `as="a"` for a native link, or pass a ref-forwarding component such as
Next.js `Link`. In the Next.js App Router the file needs `"use client"`.

Do not enable `clipContent` on controls if their focus outline must remain
outside the shape. It is intended for cards whose content bleeds to the edge.

## Without React

```ts
import { applySquircle } from "squircles/dom";

const dispose = applySquircle(document.querySelector(".card"));
```

With no options it reads everything from CSS, exactly like the React component,
and returns a cleanup function. It works on any element, in any framework, and
in plain HTML.

## Existing components

`SquircleSurface` adds only the visual SVG layer, with fill and stroke on a
single path. Use it inside a component that already owns positioning and
semantics, or when you need a semi-transparent border:

```tsx
import { SquircleSurface } from "squircles/react";

function ExistingButton() {
  return (
    <button className="button">
      <SquircleSurface
        radius={8}
        smoothing={1}
        fill="var(--button-fill)"
        stroke="var(--button-stroke)"
        strokeWidth={1}
      />
      <span className="button__label">Mehr erfahren</span>
    </button>
  );
}
```

The parent must be positioned, its rectangular background/border must be
transparent, and its content must paint above the SVG.

## Geometry only

The root entry point does not import React or touch the DOM:

```ts
import { createSquirclePath, createSquircleClipPath } from "squircles";

const path = createSquirclePath({
  width: 120,
  height: 48,
  radius: 8,
  smoothing: 1,
  inset: 0.5,
});

const clipPath = createSquircleClipPath({ width: 120, height: 48, radius: 8 });
```

`radius` accepts a number or individual corners:

```ts
radius={{
  topLeft: 24,
  topRight: 12,
  bottomRight: 24,
  bottomLeft: 12,
}}
```

## What is not supported

These are deliberate limits, not bugs:

- **Focus rings.** `outline` always follows `border-radius`. With
  `outline-offset` the mismatch is hard to see; a ring sitting directly on the
  edge will not match.
- **Different borders per side.** Only `border-top-width` and
  `border-top-color` are read.
- **Dashed and dotted borders.** Only `border-style: solid` is drawn.
- **`inset` shadows.** They are left on the element and keep following
  `border-radius`.
- **Semi-transparent borders.** The surface's clip edge shows through the
  stroke. Use `SquircleSurface` for that case.
- **`backdrop-filter`.** The element itself is not clipped, so a backdrop
  filter stays rectangular.
- **No JavaScript, or before hydration.** The element renders with its own
  `border-radius`. There is no layout shift, but there is no squircle either.

## Migrating from 0.1

`Squircle` no longer takes paint props. Move them into your stylesheet:

| 0.1 prop | Now |
|---|---|
| `fill="#192d73"` | `background: #192d73;` |
| `stroke="#e5e7eb"` | `border-color: #e5e7eb;` |
| `strokeWidth={1}` | `border-width: 1px; border-style: solid;` |
| `radius={12}` | `border-radius: 12px;` (or keep the prop) |
| `smoothing={1}` | `--squircle-smoothing: 1;` (or keep the prop) |
| `surfaceClassName` | style `[data-squircle-fill]` / `[data-squircle-stroke]` |
| `surfaceStyle` | style `[data-squircle-fill]` / `[data-squircle-stroke]` |

`SquircleSurface` is unchanged and still accepts all of them.

## Development

```sh
npm install
npm run check
```

`npm run playground` builds the package and serves two example pages:
[examples/playground.html](examples/playground.html) on
<http://localhost:5173/>, which shapes its own interface with the library, and
a React version on <http://localhost:5173/react/>. `npm run visual:fixture`
writes a static rasterization fixture to `.artifacts/`.

See [docs/architecture.md](docs/architecture.md) for the rendering rationale
and constraints.
