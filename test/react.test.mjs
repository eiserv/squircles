import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Squircle, SquircleSurface } from "../dist/react/index.js";

test("rendert das semantische Element ohne zusätzliche Hülle", () => {
  const html = renderToStaticMarkup(
    createElement(
      Squircle,
      { as: "button", type: "button", radius: 8, className: "button" },
      "Mehr erfahren",
    ),
  );

  assert.equal(
    html,
    '<button type="button" class="button">Mehr erfahren</button>',
  );
});

test("unterstützt leere HTML-Elemente", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, { as: "img", src: "/a.jpg", alt: "Ein Bild" }),
  );

  // React 19 ergänzt einen Ladehinweis für Bilder; hier zählt nur das Bildelement.
  assert.match(html, /<img src="\/a\.jpg" alt="Ein Bild"\/>/);
  assert.doesNotMatch(html, /<img[^>]*>[^<]/);
});

test("reicht übergebene Stile unverändert weiter", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, {
      as: "div",
      style: { padding: 12 },
    }),
  );

  assert.match(html, /style="padding:12px"/);
});

test("rendert auf dem Server eine deterministische SVG-Fläche mit festen Maßen", () => {
  const html = renderToStaticMarkup(
    createElement(SquircleSurface, {
      width: 120,
      height: 48,
      radius: 8,
      fill: "#192d73",
      stroke: "#e5e7eb",
      strokeWidth: 1,
    }),
  );

  assert.match(html, /^<svg /);
  assert.match(html, /viewBox="0 0 120 48"/);
  assert.match(html, /data-squircle-ready=""/);
  assert.match(html, /vector-effect="non-scaling-stroke"/);
  assert.match(html, /shape-rendering="geometricPrecision"/);
});
