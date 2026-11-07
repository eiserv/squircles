# squircles

Eckenglättung nach Figma für das Web. Hintergrund, Kontur, Schatten und Hover
bleiben in deinem CSS. Ohne zusätzliche Hülle, mit optionaler React- und
Svelte-Anbindung und ohne Laufzeitabhängigkeiten im Geometrie- und DOM-Paket.

<p align="center">
  <img src="docs/media/playground.png" width="640" alt="Die neutrale Spielwiese mit Reglern, Formvergleich und vergrößerter Ecke" />
</p>

## Installation

```sh
npm install squircles
```

## Ein CSS, mehrere Wege

```css
.taste {
  background: #242424;
  color: white;
  border: 1px solid #666;
  border-radius: 12px;
  --squircle-smoothing: 1;
  padding: 12px 20px;
}
```

**React** (ab Version 18):

```tsx
import { Squircle } from "squircles/react";

<Squircle as="button" type="button" className="taste">
  Mehr erfahren
</Squircle>
```

**Svelte** als [Action](https://svelte.dev/docs/svelte/use):

```svelte
<script>
  import { squircle } from "squircles/svelte";
</script>

<button class="taste" use:squircle>Mehr erfahren</button>
```

**JavaScript, Vue oder andere Frameworks** über den DOM-Einstieg:

```ts
import { applySquircle } from "squircles/dom";

const element = document.querySelector<HTMLElement>(".taste");
const aufraeumen = element ? applySquircle(element) : () => {};
// Beim Entfernen des Elements aufrufen.
aufraeumen();
```

Die Anbindungen lesen `border-radius` und `--squircle-smoothing` aus dem CSS.
Klassen-, Stil- und Größenänderungen sowie Hover und Fokus aktualisieren die Form.
Beim serverseitigen Rendern bleibt zunächst der normale CSS-Radius sichtbar.

## Nur die Geometrie

```ts
import { createSquirclePath, createSquircleClipPath } from "squircles";

const optionen = { width: 200, height: 96, radius: 24, smoothing: 1 };
const pfad = createSquirclePath(optionen);
const clipPath = createSquircleClipPath(optionen);
```

`radius` unterstützt einzelne Ecken; `smoothing` reicht von `0` bis `1`.
Bei wenig Platz wird die Glättung wie in Figma begrenzt.
`preserveSmoothing: true` erhält sie durch komprimierte Kontrollpunkte.
`inset` versetzt den Pfad nach innen, etwa um eine halbe SVG-Konturbreite.

<p align="center">
  <img src="docs/media/smoothing-extremes.png" width="440" alt="Durchgezogene Squircle-Kontur und gestrichelter border-radius mit vergrößerter Ecke" />
</p>

## Grenzen und weitere Beispiele

- Durchgezogene, einheitliche Konturen; keine unterschiedlichen Ränder pro Seite.
- Fokusmarkierungen und innere Schatten folgen weiterhin `border-radius`.
- Bilder und Eingaben erhalten einen Clip-Pfad, der auch ihre Kontur und ihren
  Schatten beschneidet. Bei Bedarf ein umgebendes Element verwenden.
- Für halbtransparente Konturen gibt es `SquircleSurface` unter `squircles/react`.
- Ohne `ResizeObserver` wird beim Start und bei Fenstergrößenänderungen gemessen.
  Für sonstige Layoutänderungen ist ein Polyfill nötig.

[Integration, Optionen und Migration](docs/integration.md) ·
[Architektur und Grenzen](docs/architecture.md)

## Entwicklung

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm run playground
```

Spielwiese: [localhost:5173](http://localhost:5173/), React:
[localhost:5173/react](http://localhost:5173/react/).
Svelte-Beispiele: [localhost:5173/svelte](http://localhost:5173/svelte/).
`npm run screenshots` erstellt die README-Bilder mit transparentem Schatten neu.
`npm run visual:fixture` erzeugt weitere Geometriebeispiele in `.artifacts/`.

Commits auf `main` verwenden [Conventional Commits](https://www.conventionalcommits.org/).
release-please erstellt die Versions-PR; ihr Merge veröffentlicht das npm-Paket.
