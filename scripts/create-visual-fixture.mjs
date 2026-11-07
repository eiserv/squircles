import { mkdir, writeFile } from "node:fs/promises";
import { createSquirclePath } from "../dist/index.js";

const cases = [
  { width: 120, height: 48, radius: 8, smoothing: 1, strokeWidth: 1 },
  { width: 147.375, height: 48, radius: 8, smoothing: 1, strokeWidth: 1 },
  { width: 220, height: 48, radius: 8, smoothing: 0.6, strokeWidth: 1 },
  { width: 48, height: 48, radius: 12, smoothing: 1, strokeWidth: 1 },
  { width: 180, height: 64, radius: 20, smoothing: 1, strokeWidth: 1.5 },
  { width: 240, height: 96, radius: 32, smoothing: 0.8, strokeWidth: 2 },
  // Karte, Fläche ohne Kontur und Pillenform wie auf den Beispielseiten.
  { width: 260, height: 180, radius: 20, smoothing: 1, strokeWidth: 1 },
  { width: 260, height: 120, radius: 12, smoothing: 1, strokeWidth: 0 },
  { width: 120, height: 32, radius: 999, smoothing: 1, strokeWidth: 1 },
];

const rows = cases
  .map(({ width, height, radius, smoothing, strokeWidth }, index) => {
    const path = createSquirclePath({
      width,
      height,
      radius,
      smoothing,
      inset: strokeWidth / 2,
    });
    const label = `${width} × ${height} · r${radius} · s${smoothing} · ${strokeWidth}px`;

    return `
      <article>
        <div class="stage ${index % 2 === 0 ? "light" : "dark"}">
          <svg
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}"
            aria-label="${label}"
          >
            <path
              d="${path}"
              fill="${index % 2 === 0 ? "#242424" : "#ffffff"}"
              stroke="${index % 2 === 0 ? "#888888" : "#242424"}"
              stroke-width="${strokeWidth}"
              vector-effect="non-scaling-stroke"
              shape-rendering="geometricPrecision"
            />
          </svg>
        </div>
        <code>${label}</code>
      </article>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Squircle-Geometriebeispiele</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f7f7f7;
        color: #242424;
        font: 16px/1.4 system-ui, sans-serif;
      }
      main {
        width: min(1120px, calc(100% - 48px));
        margin: 48px auto;
      }
      h1 { margin: 0 0 8px; }
      p { margin: 0 0 32px; color: #666666; }
      section {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }
      article {
        overflow: hidden;
        border: 1px solid #dedede;
        border-radius: 16px;
        background: white;
      }
      .stage {
        min-height: 190px;
        display: grid;
        place-items: center;
        background-image:
          linear-gradient(45deg, rgba(0, 0, 0, .035) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(0, 0, 0, .035) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, .035) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, .035) 75%);
        background-position: 0 0, 0 8px, 8px -8px, -8px 0;
        background-size: 16px 16px;
      }
      .stage.dark { background-color: #dddddd; }
      svg { display: block; overflow: visible; }
      code {
        display: block;
        padding: 14px 16px;
        border-top: 1px solid #dedede;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Squircle-Rasterisierung</h1>
      <p>Ein Pfad, eine Füllung und eine SVG-Kontur, um ihre halbe Breite nach innen versetzt.</p>
      <section>${rows}</section>
    </main>
  </body>
</html>`;

const outputDirectory = new URL("../.artifacts/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL("visual-fixture.html", outputDirectory), html, "utf8");
