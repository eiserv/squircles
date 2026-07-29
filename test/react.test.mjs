import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Squircle, SquircleSurface } from "../dist/react/index.js";

test("renders the semantic host and nothing else", () => {
  const html = renderToStaticMarkup(
    createElement(
      Squircle,
      { as: "button", type: "button", radius: 8, className: "button" },
      "Learn more",
    ),
  );

  assert.equal(
    html,
    '<button type="button" class="button">Learn more</button>',
  );
});

test("does not crash on a void element", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, { as: "img", src: "/a.jpg", alt: "A picture" }),
  );

  // React 19 also emits a preload link for images; only the tag itself matters.
  assert.match(html, /<img src="\/a\.jpg" alt="A picture"\/>/);
  assert.doesNotMatch(html, /<img[^>]*>[^<]/);
});

test("passes the caller's style through untouched", () => {
  const html = renderToStaticMarkup(
    createElement(Squircle, {
      as: "div",
      style: { padding: 12 },
    }),
  );

  assert.match(html, /style="padding:12px"/);
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
