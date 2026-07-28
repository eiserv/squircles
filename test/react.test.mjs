import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Squircle, SquircleSurface } from "../dist/react/index.js";

test("renders a semantic button with an SSR fallback", () => {
  const html = renderToStaticMarkup(
    createElement(
      Squircle,
      {
        as: "button",
        type: "button",
        radius: 8,
        smoothing: 1,
        fill: "#192d73",
        stroke: "#e5e7eb",
        strokeWidth: 1,
      },
      "Mehr erfahren",
    ),
  );

  assert.match(html, /^<button /);
  assert.match(html, /background-color:#192d73/);
  assert.match(html, /corner-shape:squircle/);
  assert.match(html, />Mehr erfahren<\/button>$/);
});

test("renders a deterministic fixed-size SVG surface on the server", () => {
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
