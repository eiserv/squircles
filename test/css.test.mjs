import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "../dist/css/index.js";

/** Minimal stand-in for CSSStyleDeclaration. */
function styles(values) {
  return {
    getPropertyValue: (property) => values[property] ?? "",
  };
}

test("reads four pixel corners", () => {
  const radii = resolveRadiusFromComputed(
    styles({
      "border-top-left-radius": "12px",
      "border-top-right-radius": "4px",
      "border-bottom-right-radius": "0px",
      "border-bottom-left-radius": "8px",
    }),
    { width: 200, height: 100 },
  );

  assert.deepEqual(radii, {
    topLeft: 12,
    topRight: 4,
    bottomRight: 0,
    bottomLeft: 8,
  });
});

test("resolves percentages against the shorter axis", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "50%" }),
    { width: 200, height: 100 },
  );

  // 50% of 200 is 100 horizontally, 50 vertically; the circle must fit both.
  assert.equal(radii.topLeft, 50);
});

test("takes the inscribed circle of an elliptical corner", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "40px 10px" }),
    { width: 200, height: 100 },
  );

  assert.equal(radii.topLeft, 10);
});

test("treats missing and unparseable values as zero", () => {
  const radii = resolveRadiusFromComputed(styles({}), {
    width: 200,
    height: 100,
  });

  assert.deepEqual(radii, {
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
  });
});

test("defaults smoothing to full and preserve to off", () => {
  assert.deepEqual(resolveSmoothingFromComputed(styles({})), {
    smoothing: 1,
    preserveSmoothing: false,
  });
});

test("reads smoothing and preserve from custom properties", () => {
  assert.deepEqual(
    resolveSmoothingFromComputed(
      styles({
        "--squircle-smoothing": " 0.6 ",
        "--squircle-preserve-smoothing": "1",
      }),
    ),
    { smoothing: 0.6, preserveSmoothing: true },
  );
});

test("clamps smoothing into the supported range", () => {
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "5" }))
      .smoothing,
    1,
  );
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "-2" }))
      .smoothing,
    0,
  );
});
