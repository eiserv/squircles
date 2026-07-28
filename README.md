# squircles

Small Figma-style squircles for TypeScript and React.

- zero dependencies in the geometry package;
- React is an optional peer dependency;
- one SVG path draws both fill and border;
- no data-URL masks, canvas, paint worklets, or CSS-in-JS;
- responsive via `ResizeObserver`;
- rounded/native `corner-shape` fallback during SSR and before hydration;
- ESM, strict TypeScript, and tree-shakeable entry points.

## Why this exists

Figma corner smoothing is not the same shape as `border-radius`. Existing web
solutions generally create an SVG path or clip path. A clip path works well for
fills, but a button border is easy to get wrong: subtracting a pixel from the
radius does not create the exact inner offset of a smoothed curve, and combining
a clip path with a separately rasterized mask can produce uneven-looking
one-pixel edges.

This package uses one inset SVG path with a native SVG stroke. Fill and border
therefore share the same curve and rasterization pass.

## Install

```sh
npm install squircles
```

## React

Use `Squircle` when the component can own the visual surface:

```tsx
import { Squircle } from "squircles/react";

export function CallToAction() {
  return (
    <Squircle
      as="button"
      type="button"
      radius={8}
      smoothing={1}
      fill="var(--button-fill)"
      stroke="var(--button-stroke)"
      strokeWidth={1}
      className="button"
    >
      Mehr erfahren
    </Squircle>
  );
}
```

```css
.button {
  --button-fill: #192d73;
  --button-stroke: #e5e7eb;
  min-height: 48px;
  padding: 12px 16px;
  color: white;
}

.button:hover {
  --button-fill: #14245e;
}

.button:focus-visible {
  outline: 2px solid #192d73;
  outline-offset: 4px;
}
```

Use `as="a"` for a native link, or pass a ref-forwarding component such as
Next.js `Link`:

```tsx
<Squircle as={Link} href="/kontakt/" radius={8} fill="#192d73">
  Kontakt
</Squircle>
```

Do not enable `clipContent` on controls if their focus outline must remain
outside the shape. It is intended for images and cards.

## Existing components

`SquircleSurface` adds only the visual SVG layer:

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

The root entry point does not import React:

```ts
import { createSquirclePath } from "squircles";

const path = createSquirclePath({
  width: 120,
  height: 48,
  radius: 8,
  smoothing: 1,
  inset: 0.5,
});
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

## Development

```sh
npm install
npm run check
```

See [docs/architecture.md](docs/architecture.md) for the rendering rationale
and constraints. A generic integration example is available in
[examples/react-button.tsx](examples/react-button.tsx).
