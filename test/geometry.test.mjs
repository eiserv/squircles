import assert from "node:assert/strict";
import test from "node:test";
import { createSquirclePath, resolveSquircleRadii } from "../dist/index.js";

test("creates a plain rectangle when the radius is zero", () => {
  assert.equal(
    createSquirclePath({ width: 100, height: 48 }),
    "M 100 0 L 100 48 L 0 48 L 0 0 Z",
  );
});

test("creates a stable fully smoothed button path", () => {
  assert.equal(
    createSquirclePath({
      width: 120,
      height: 48,
      radius: 8,
      smoothing: 1,
    }),
    "M 104 0 c 7.5425 0 11.3137 0 13.6569 2.3431 c 2.3431 2.3431 2.3431 6.1144 2.3431 13.6569 L 120 32 c 0 7.5425 0 11.3137 -2.3431 13.6569 c -2.3431 2.3431 -6.1144 2.3431 -13.6569 2.3431 L 16 48 c -7.5425 0 -11.3137 0 -13.6569 -2.3431 c -2.3431 -2.3431 -2.3431 -6.1144 -2.3431 -13.6569 L 0 16 c 0 -7.5425 0 -11.3137 2.3431 -13.6569 c 2.3431 -2.3431 6.1144 -2.3431 13.6569 -2.3431 Z",
  );
});

test("keeps a one-pixel SVG stroke fully inside the box", () => {
  const path = createSquirclePath({
    width: 120,
    height: 48,
    radius: 8,
    smoothing: 1,
    inset: 0.5,
  });

  assert.match(path, /^M 104\.5 0\.5 /);
  assert.match(path, / L 119\.5 32\.5 /);
  assert.match(path, / L 15\.5 47\.5 /);
  assert.match(path, / L 0\.5 15\.5 /);
});

test("normalizes individual corners without overlap", () => {
  const path = createSquirclePath({
    width: 60,
    height: 40,
    radius: {
      topLeft: 30,
      topRight: 30,
      bottomRight: 4,
      bottomLeft: 12,
    },
    smoothing: 1,
  });

  assert.ok(path.startsWith("M "));
  assert.ok(!path.includes("NaN"));
  assert.ok(!path.includes("Infinity"));
});

test("clamps smoothing and negative radii", () => {
  assert.equal(
    createSquirclePath({
      width: 100,
      height: 48,
      radius: -8,
      smoothing: 4,
    }),
    "M 100 0 L 100 48 L 0 48 L 0 0 Z",
  );
});

test("returns an empty path for a zero-sized box", () => {
  assert.equal(createSquirclePath({ width: 0, height: 48, radius: 8 }), "");
});

test("rejects invalid numeric input", () => {
  assert.throws(
    () => createSquirclePath({ width: Number.NaN, height: 48 }),
    /width must be a finite number/,
  );
  assert.throws(
    () => createSquirclePath({ width: -1, height: 48 }),
    /zero or greater/,
  );
});

test("resolves shorthand and per-corner radii", () => {
  assert.deepEqual(resolveSquircleRadii(8), {
    topLeft: 8,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 8,
  });
  assert.deepEqual(resolveSquircleRadii({ topLeft: 12 }), {
    topLeft: 12,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
  });
});

test("stays finite across responsive sizes and corner budgets", () => {
  for (let index = 1; index <= 500; index += 1) {
    const width = 24 + ((index * 37) % 320) + (index % 3) / 3;
    const height = 20 + ((index * 19) % 140) + (index % 5) / 5;
    const strokeWidth = (index % 5) / 2;
    const path = createSquirclePath({
      width,
      height,
      radius: {
        topLeft: (index * 7) % 96,
        topRight: (index * 11) % 96,
        bottomRight: (index * 13) % 96,
        bottomLeft: (index * 17) % 96,
      },
      smoothing: (index % 11) / 10,
      preserveSmoothing: index % 2 === 0,
      inset: strokeWidth / 2,
    });

    assert.ok(path.length > 0);
    assert.ok(!path.includes("NaN"));
    assert.ok(!path.includes("Infinity"));
  }
});
