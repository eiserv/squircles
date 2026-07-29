import assert from "node:assert/strict";
import test from "node:test";
import { createSquircleClipPath } from "../dist/index.js";

test("wraps a path in a CSS path() value", () => {
  const value = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
  });

  assert.ok(value.startsWith("path('M "), value);
  assert.ok(value.endsWith(" Z')"), value);
});

test("returns none for a degenerate box so the CSS value stays valid", () => {
  assert.equal(createSquircleClipPath({ width: 0, height: 48 }), "none");
  assert.equal(createSquircleClipPath({ width: 120, height: 0 }), "none");
});

test("passes options through to the geometry", () => {
  const inset = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
    inset: 0.5,
  });

  assert.ok(inset.startsWith("path('M 104.5 0.5 "), inset);
});
