# Integration

## CSS als Ausgangspunkt

Die DOM-, React- und Svelte-Anbindungen verwenden dieselbe Darstellung.
`border-radius` und die folgenden CSS-Variablen bestimmen die Form:

```css
.karte {
  background: white;
  border: 1px solid #ddd;
  border-radius: 24px;
  --squircle-smoothing: 1;
  --squircle-preserve-smoothing: 1;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}
```

Prozentuale Radien werden pro Achse aufgelöst. Bei elliptischen CSS-Ecken wird
der einbeschriebene Kreis verwendet. Die obere Kontur bestimmt Breite und Farbe
aller Seiten. Äußere Schatten unterstützen auch `oklch()` und `color()`.
Innere Schatten lassen sich nicht mit äußeren Schatten kombinieren; bei einer
gemischten Liste unterdrückt die Ersatzdarstellung den ursprünglichen Schatten.

Die optionalen Werte `radius`, `smoothing`, `preserveSmoothing` und `clipContent`
überschreiben das CSS. `clipContent` beschneidet auch Kinder und außenliegende
Fokusmarkierungen; auf Bedienelementen sollte es deshalb deaktiviert bleiben.

Änderungen der eigenen `class`- und `style`-Attribute, der Größe, des Hover- und
Fokuszustands sowie Beginn und Ende eigener CSS-Übergänge lösen eine Aktualisierung
aus. Änderungen ausschließlich an Vorfahren, Stylesheets oder Medienabfragen
werden ohne eines dieser Ereignisse nicht automatisch erkannt.

## React und Next.js

```tsx
import { Squircle } from "squircles/react";

export function Karte() {
  return (
    <Squircle as="article" className="karte">
      <Squircle as="img" src="/foto.jpg" alt="Eine Berglandschaft" />
      <p>Alle Eigenschaften des nativen Elements bleiben erhalten.</p>
    </Squircle>
  );
}
```

`as` akzeptiert auch eigene Komponenten, die ihre Ref an ein HTML-Element
weiterreichen, etwa Next.js `Link`. Im App Router benötigt die aufrufende Datei
`"use client"`. Die Geometriefunktionen können auch auf dem Server laufen.
`Squircle` rendert dort zunächst nur das native Element; CSS liefert die Rundung.

`useSquirclePath` und `useSquircleClipPath` messen eine eigene Ref. Mit der Option
`size: { width, height }` funktionieren sie ohne Größenbeobachtung und bereits
beim serverseitigen Rendern. Leere Flächen ergeben einen leeren Pfad bzw. `none`.

### Bestehende Komponenten und halbtransparente Konturen

`SquircleSurface` zeichnet Füllung und Kontur gemeinsam als SVG-Pfad:

```tsx
import { SquircleSurface } from "squircles/react";

<button className="eigene-taste">
  <SquircleSurface radius={12} smoothing={1} fill="#242424"
    stroke="rgb(255 255 255 / 40%)" strokeWidth={1} />
  <span>Mehr erfahren</span>
</button>
```

Das Elternelement benötigt `position: relative`, transparente eigene Flächen
und Konturen sowie Text oberhalb des SVG, etwa über `position: relative` am `span`.
`width` und `height` ermöglichen auch hier eine feste Größe ohne Messung.

## Svelte

Die Action verwendet den [Lebenszyklus mit `update` und `destroy`](https://svelte.dev/docs/svelte-action).
Sie importiert keine Svelte-Laufzeit und eignet sich für Svelte 4 und 5.

```svelte
<script>
  import { squircle } from "squircles/svelte";
  let glaettung = 1;
</script>

<input aria-label="Glättung" type="range" min="0" max="1" step="0.05"
  bind:value={glaettung} />
<button class="karte" use:squircle={{ smoothing: glaettung }}>
  Mehr erfahren
</button>
```

Neue Optionen ersetzen die bisherigen. Das Entfernen des Elements räumt
Beobachter und Darstellung auf. Für Svelte ab 5.29 lässt sich die DOM-Funktion
auch direkt als [Attachment](https://svelte.dev/docs/svelte/@attach) verwenden:

```svelte
<script>
  import { applySquircle } from "squircles/dom";
</script>

<button class="karte" {@attach (element) => applySquircle(element)}>
  Mehr erfahren
</button>
```

## Vue und andere Frameworks

`applySquircle` benötigt ein gemountetes HTML-Element und liefert eine
Aufräumfunktion. Beispiel für Vue 3:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { applySquircle } from "squircles/dom";

const element = ref<HTMLElement | null>(null);
let aufraeumen: (() => void) | undefined;
onMounted(() => {
  if (element.value) aufraeumen = applySquircle(element.value);
});
onBeforeUnmount(() => aufraeumen?.());
</script>

<template>
  <button ref="element" class="karte">Mehr erfahren</button>
</template>
```

CSS-Änderungen am Element werden automatisch übernommen. Für neue
Geometrieoptionen die bisherige Anbindung aufräumen und erneut anwenden.
Die Aufräumfunktion darf mehrfach aufgerufen werden. Nachträgliche
Inline-Stiländerungen bleiben beim Neuzeichnen und Aufräumen erhalten.
Pro Element darf nur eine Anbindung gleichzeitig aktiv sein.

## Migration von 0.1

Die Gestaltung von `Squircle` erfolgt seit 0.2 im CSS:

| Frühere Eigenschaft | CSS oder Ersatz |
| --- | --- |
| `fill` | `background` |
| `stroke` | `border-color` |
| `strokeWidth` | `border-width` und `border-style: solid` |
| `radius` | `border-radius` oder weiterhin die Option |
| `smoothing` | `--squircle-smoothing` oder weiterhin die Option |
| `surfaceClassName`, `surfaceStyle` | `[data-squircle-fill]` und `[data-squircle-stroke]` |

`SquircleSurface` unterstützt weiterhin die SVG-Gestaltungseigenschaften.
