import type { ElementSize } from "../size.js";
import {
  clearLayers,
  syncLayers,
  type SquircleGeometryOptions,
} from "./layers.js";

/** Matches the quantisation the React hook already uses. */
function roundLayoutSize(value: number): number {
  return Math.round(value * 64) / 64;
}

const REREAD_EVENTS = ["pointerenter", "pointerleave", "focusin", "focusout"] as const;

/** Only the host's own transitions; these bubble up from every descendant. */
const TRANSITION_EVENTS = ["transitionrun", "transitionend"] as const;

/**
 * Shapes an element from its own CSS and keeps it in sync. Returns a cleanup
 * function that removes the layers and restores the inline style.
 */
export function applySquircle(
  element: HTMLElement,
  options: SquircleGeometryOptions = {},
): () => void {
  let size: ElementSize | null = null;
  let frame = 0;
  let disposed = false;

  const sync = (): void => {
    frame = 0;

    if (disposed || !size || size.width <= 0 || size.height <= 0) {
      return;
    }

    syncLayers(element, size, options);
    // syncLayers writes the host's own inline style. Drop those records so
    // the observer below does not schedule another sync every frame.
    mutationObserver.takeRecords();
  };

  // Hover, focus, and class changes all land in the same frame.
  const schedule = (): void => {
    if (disposed || frame !== 0) {
      return;
    }

    frame = requestAnimationFrame(sync);
  };

  const measure = (width: number, height: number): void => {
    const next = {
      width: roundLayoutSize(width),
      height: roundLayoutSize(height),
    };

    if (size?.width === next.width && size.height === next.height) {
      return;
    }

    size = next;
    schedule();
  };

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries.at(-1);

    if (!entry) {
      return;
    }

    const sizes = entry.borderBoxSize as
      | ResizeObserverSize
      | readonly ResizeObserverSize[];
    const box = Array.isArray(sizes) ? sizes[0] : (sizes as ResizeObserverSize);

    if (box) {
      measure(box.inlineSize, box.blockSize);
      return;
    }

    const rect = element.getBoundingClientRect();
    measure(rect.width, rect.height);
  });

  resizeObserver.observe(element, { box: "border-box" });

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(element, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const scheduleOwnTransition = (event: Event): void => {
    if (event.target === element) {
      schedule();
    }
  };

  for (const type of REREAD_EVENTS) {
    element.addEventListener(type, schedule);
  }

  for (const type of TRANSITION_EVENTS) {
    element.addEventListener(type, scheduleOwnTransition);
  }

  return () => {
    disposed = true;

    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }

    resizeObserver.disconnect();
    mutationObserver.disconnect();

    for (const type of REREAD_EVENTS) {
      element.removeEventListener(type, schedule);
    }

    for (const type of TRANSITION_EVENTS) {
      element.removeEventListener(type, scheduleOwnTransition);
    }

    clearLayers(element);
  };
}
