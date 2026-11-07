import assert from "node:assert/strict";
import test from "node:test";
import { readBorderBox } from "../dist/dom/observe-size.js";

test("handles older observers with a single size object", () => {
  const original = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (element) => ({ writingMode: element.mode });
  try {
    for (const mode of ["horizontal-tb", "vertical-rl", "sideways-lr"]) {
      const vertical = mode !== "horizontal-tb";
      const box = { inlineSize: vertical ? 48 : 120, blockSize: vertical ? 120 : 48 };
      for (const borderBoxSize of [box, [box]]) {
        assert.deepEqual(readBorderBox({ target: { mode }, borderBoxSize }), {
          width: 120,
          height: 48,
        });
      }
    }
  } finally {
    if (original === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = original;
  }
});

test("missing border-box data allows fallback measurement", () => {
  assert.equal(readBorderBox({ borderBoxSize: undefined }), null);
  assert.equal(readBorderBox({ borderBoxSize: [] }), null);
});
