import { applySquircle } from "../dom/apply-squircle.js";
import type { SquircleGeometryOptions } from "../dom/layers.js";

export type { SquircleGeometryOptions };

/** Svelte action with CSS defaults, reactive options, and automatic cleanup. */
export function squircle(
  element: HTMLElement,
  options: SquircleGeometryOptions = {},
): { update(options?: SquircleGeometryOptions): void; destroy(): void } {
  let dispose = applySquircle(element, options);
  let destroyed = false;

  return {
    update(next = {}) {
      if (destroyed) return;
      dispose();
      dispose = applySquircle(element, next);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      dispose();
    },
  };
}
