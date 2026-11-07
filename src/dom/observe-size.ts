import type { ElementSize } from "../size.js";

function round(value: number): number {
  return Math.round(value * 64) / 64;
}

/** Reads physical dimensions, including vertical and sideways writing modes. */
export function readBorderBox(entry: ResizeObserverEntry): ElementSize | null {
  const sizes = entry.borderBoxSize as
    | ResizeObserverSize
    | readonly ResizeObserverSize[];
  const box = Array.isArray(sizes) ? sizes[0] : (sizes as ResizeObserverSize);
  if (!box) return null;

  const mode = getComputedStyle(entry.target).writingMode;
  const vertical = /^(vertical|sideways)/.test(mode);
  return {
    width: round(vertical ? box.blockSize : box.inlineSize),
    height: round(vertical ? box.inlineSize : box.blockSize),
  };
}

/**
 * Shared DOM and React measurement, with window resize updates when no observer is
 * available.
 */
export function observeElementSize(
  element: Element,
  update: (size: ElementSize) => void,
): () => void {
  const measure = (): void => {
    const rect = element.getBoundingClientRect();
    update({ width: round(rect.width), height: round(rect.height) });
  };

  if (typeof ResizeObserver === "undefined") {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries.at(-1);
    if (!entry) return;
    const box = readBorderBox(entry);
    if (box) update(box);
    else measure();
  });
  observer.observe(element, { box: "border-box" });
  return () => observer.disconnect();
}
