import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBoxShadow,
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

test("returns nothing for none", () => {
  assert.deepEqual(parseBoxShadow("none"), []);
  assert.deepEqual(parseBoxShadow(""), []);
});

test("parses a single shadow with all four lengths", () => {
  assert.deepEqual(parseBoxShadow("rgba(0, 0, 0, 0.15) 0px 4px 12px 2px"), [
    {
      color: "rgba(0, 0, 0, 0.15)",
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      spread: 2,
    },
  ]);
});

test("defaults blur and spread when omitted", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) 1px 2px"), [
    { color: "rgb(0, 0, 0)", offsetX: 1, offsetY: 2, blur: 0, spread: 0 },
  ]);
});

test("splits multiple shadows without breaking on colour commas", () => {
  const shadows = parseBoxShadow(
    "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgba(0, 0, 0, 0.2) 0px 8px 24px -4px",
  );

  assert.equal(shadows.length, 2);
  assert.equal(shadows[0].color, "rgba(0, 0, 0, 0.1)");
  assert.equal(shadows[1].offsetY, 8);
  assert.equal(shadows[1].spread, -4);
});

test("skips inset shadows", () => {
  const shadows = parseBoxShadow(
    "rgb(0, 0, 0) 0px 2px 4px 0px inset, rgb(255, 0, 0) 0px 3px 6px 0px",
  );

  assert.equal(shadows.length, 1);
  assert.equal(shadows[0].color, "rgb(255, 0, 0)");
});

test("handles negative offsets", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) -2px -4px 8px 0px"), [
    { color: "rgb(0, 0, 0)", offsetX: -2, offsetY: -4, blur: 8, spread: 0 },
  ]);
});
