# Architecture

## Package boundaries

- `squircles`: pure geometry with no DOM access or runtime dependencies.
- `squircles/dom`: CSS-driven rendering through `applySquircle`.
- `squircles/react`: components and hooks, with React as an optional peer.
- `squircles/svelte`: an action with updates and cleanup, without a Svelte import.
- `src/css/`: structural readers for computed CSS values, testable in Node.

The public API, documentation, comments, examples, and error messages use English.

## Geometry and borders

The geometry follows Figma's published cubic Bézier construction:
`smoothing: 0` uses circular arcs; `1` uses fully smoothed transitions.
Each corner receives a proportional share of its adjacent sides. When space is
limited, smoothing is constrained. `preserveSmoothing` instead compresses the
first control points.

Borders use an SVG stroke on a path inset by half the stroke width. There is no
separate inner mask: simply shrinking a corner radius would not produce an exact
parallel offset of a Bézier curve. Sources and acknowledgments are in `NOTICE`.

## Rendering layers

`Squircle` renders only its native element. An effect binds `applySquircle` to
that element, keeping rendering layers outside React reconciliation. Changing
`as` removes the previous binding and measures the new element.

| Layer | Stacking order | Purpose |
| --- | --- | --- |
| `[data-squircle-shadow]` | -3 | An offset, blurred shape for each outer shadow |
| `[data-squircle-fill]` | -2 | A copied background clipped to the smoothed shape |
| `[data-squircle-stroke]` | -1 | An SVG stroke on the smoothed path |

All layers ignore pointer events. Their negative offset by the border width
compensates for the difference between padding and border boxes. The original
border becomes transparent but retains its width to prevent layout shifts.
The host is not clipped by default, keeping shadows and focus outlines visible.

The SVG stroke covers the clipped background edge. Semi-transparent borders may
expose that edge; `SquircleSurface` avoids this by drawing fill and stroke
together on one SVG path.

## Reading and restoring CSS

Our overrides are temporarily lifted to read authored styles. Transitions stay
disabled during the read to prevent new transitions or endless updates.
Updates are coalesced per animation frame; our own mutation records are discarded
afterward.

Each element stores its authored and most recently applied inline styles.
Differences from the applied state are merged into the authored state, preserving
later framework changes across redraws and cleanup. Assigning exactly the same
value already applied by the library cannot be distinguished from our override.

Only one binding per element is supported. Cleanup is idempotent and removes
observers, event handlers, pending frames, and our own layers.

## Size measurement

DOM and React share the same measurement code. `ResizeObserver` provides logical
inline and block dimensions, which are mapped to physical width and height using
`writing-mode`, including `vertical-*` and `sideways-*`. Sizes are rounded to
1/64 pixel to avoid updates caused by tiny measurement differences.

Without `ResizeObserver`, dimensions are measured on startup and window resize.
Other layout changes require a polyfill. Fixed sizes bypass measurement in the
React hooks. Boxes with zero width or height have no visible valid path.

## Limits

- `outline` and inset shadows still follow ordinary CSS rounding.
- Only solid borders based on the top border values are drawn.
- Elliptical radii are reduced to the inscribed circle.
- Void HTML elements such as `img` and `input` receive a clip path directly,
  which also clips their own border and shadow.
- `backdrop-filter` remains rectangular unless `clipContent` is enabled.
- Shadow lists are composited as individual layers. Inset shadows are not
  redrawn; in mixed lists, they disappear when the original shadow is suppressed.
- Changes exclusively to ancestors or stylesheets need an observed event on the
  element, such as a size or class change.
- Background transitions are forwarded; geometry and border changes are redrawn
  at update time.
- Fractional physical pixels can still produce slightly different rasterization
  on opposite edges.

## Verification and images

`npm run check` verifies types, geometry, CSS readers, server-side React rendering,
and package contents. `npm run test:browser` checks DOM lifecycles, style changes,
writing modes, and the playground in Chromium. `npm run screenshots` captures the
playground and renders its shadow into a transparent PNG margin. Image widths in
the README are explicitly limited.
