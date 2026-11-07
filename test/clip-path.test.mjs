import assert from "node:assert/strict";
import test from "node:test";
import { createSquircleClipPath } from "../dist/index.js";

test("verpackt den Pfad als CSS-Wert", () => {
  const value = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
  });

  assert.ok(value.startsWith("path('M "), value);
  assert.ok(value.endsWith(" Z')"), value);
});

test("liefert bei leeren Flächen den gültigen CSS-Wert none", () => {
  assert.equal(createSquircleClipPath({ width: 0, height: 48 }), "none");
  assert.equal(createSquircleClipPath({ width: 120, height: 0 }), "none");
});

test("reicht Optionen an die Geometrie weiter", () => {
  const inset = createSquircleClipPath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
    inset: 0.5,
  });

  assert.ok(inset.startsWith("path('M 104.5 0.5 "), inset);
});
