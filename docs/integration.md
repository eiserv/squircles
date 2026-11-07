# Integration

## Start with CSS

The DOM, React, and Svelte integrations share the same renderer.
`border-radius` and the following CSS custom properties define the shape:

```css
.card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 24px;
  --squircle-smoothing: 1;
  --squircle-preserve-smoothing: 1;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}
```

Percentage radii resolve per axis. Elliptical CSS corners use the inscribed
circle. The top border determines the width and color of all sides. Outer
shadows also support `oklch()` and `color()`. Inset and outer shadows cannot be
combined: for mixed lists, the replacement rendering suppresses the original
shadow, including its inset entries.

The optional `radius`, `smoothing`, `preserveSmoothing`, and `clipContent` values
override CSS. `clipContent` also clips children and external focus outlines;
leave it disabled on controls that need those outlines.

Changes to the element's own `class` and `style` attributes, size, hover and focus
states, and the start and end of its own CSS transitions trigger updates.
Changes exclusively to ancestors, stylesheets, or media queries are not detected
automatically without one of these events.

## React and Next.js

```tsx
import { Squircle } from "squircles/react";

export function Card() {
  return (
    <Squircle as="article" className="card">
      <Squircle as="img" src="/photo.jpg" alt="A mountain landscape" />
      <p>All native element properties remain available.</p>
    </Squircle>
  );
}
```

`as` also accepts custom components that forward their ref to an HTML element,
such as Next.js `Link`. In the App Router, the calling file needs `"use client"`.
Geometry functions can also run on the server. `Squircle` initially renders only
its native element there, with CSS supplying the rounded-corner fallback.

`useSquirclePath` and `useSquircleClipPath` measure a custom ref. With the option
`size: { width, height }`, they work without observation and during server-side
rendering. Empty boxes produce an empty path or `none`.

### Existing components and semi-transparent borders

`SquircleSurface` draws fill and stroke together on one SVG path:

```tsx
import { SquircleSurface } from "squircles/react";

<button className="custom-button">
  <SquircleSurface radius={12} smoothing={1} fill="#242424"
    stroke="rgb(255 255 255 / 40%)" strokeWidth={1} />
  <span>Learn more</span>
</button>
```

The parent needs `position: relative`, transparent backgrounds and borders,
and text above the SVG, for example with `position: relative` on the `span`.
`width` and `height` also allow fixed dimensions without measurement.

## Svelte

The action uses the [`update` and `destroy` lifecycle](https://svelte.dev/docs/svelte-action).
It imports no Svelte runtime and works with Svelte 4 and 5.

```svelte
<script>
  import { squircle } from "squircles/svelte";
  let smoothing = 1;
</script>

<input aria-label="Smoothing" type="range" min="0" max="1" step="0.05"
  bind:value={smoothing} />
<button class="card" use:squircle={{ smoothing }}>
  Learn more
</button>
```

New options replace previous ones. Removing the element cleans up observers and
rendered layers. In Svelte 5.29 or later, the DOM function can also be used
directly as an [attachment](https://svelte.dev/docs/svelte/@attach):

```svelte
<script>
  import { applySquircle } from "squircles/dom";
</script>

<button class="card" {@attach (element) => applySquircle(element)}>
  Learn more
</button>
```

## Vue and other frameworks

`applySquircle` needs a mounted HTML element and returns a cleanup function.
For example, in Vue 3:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { applySquircle } from "squircles/dom";

const element = ref<HTMLElement | null>(null);
let cleanup: (() => void) | undefined;
onMounted(() => {
  if (element.value) cleanup = applySquircle(element.value);
});
onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <button ref="element" class="card">Learn more</button>
</template>
```

CSS changes on the element are picked up automatically. To change geometry
options, clean up the previous binding and apply it again. Cleanup can be called
repeatedly. Later inline style changes survive redraws and cleanup.
Only one active binding per element is supported.

## Migrating from 0.1

Since 0.2, `Squircle` takes its paint styles from CSS:

| Previous prop | CSS or replacement |
| --- | --- |
| `fill` | `background` |
| `stroke` | `border-color` |
| `strokeWidth` | `border-width` and `border-style: solid` |
| `radius` | `border-radius`, or keep using the option |
| `smoothing` | `--squircle-smoothing`, or keep using the option |
| `surfaceClassName`, `surfaceStyle` | `[data-squircle-fill]` and `[data-squircle-stroke]` |

`SquircleSurface` still supports SVG paint props.
